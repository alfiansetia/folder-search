//! Filesystem backend — pengganti `fs:readDir` dan `fs:search` versi Electron lama.
//!
//! ATURAN: semua logika baca/cari file WAJIB di sini. Jangan duplikasi
//! walk direktori di modul lain — tambah fungsi di sini bila perlu.
//! Lihat juga `.ai/FUNCTIONS.md`.

use ignore::{WalkBuilder, WalkState};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};

/// Batas hasil search (paritas perilaku versi lama: max 500).
pub const MAX_RESULTS: usize = 500;
/// Kedalaman maksimum search rekursif (paritas perilaku versi lama: 10).
pub const MAX_DEPTH_RECURSIVE: usize = 10;

#[derive(Clone, Debug)]
pub struct Entry {
    pub name: String,
    pub path: PathBuf,
    pub is_dir: bool,
    pub size: u64,
    /// Detik epoch mtime (0 bila tak terbaca). Untuk sort "Terbaru".
    pub modified: u64,
}

pub struct SearchOptions {
    pub recursive: bool,
    pub case_sensitive: bool,
    pub exact: bool,
}

pub fn format_size(size: u64) -> String {
    const UNITS: [&str; 5] = ["B", "KB", "MB", "GB", "TB"];
    let mut v = size as f64;
    let mut u = 0;
    while v >= 1024.0 && u < UNITS.len() - 1 {
        v /= 1024.0;
        u += 1;
    }
    if u == 0 {
        format!("{} B", size)
    } else {
        format!("{:.1} {}", v, UNITS[u])
    }
}

pub fn entry_info(e: &Entry) -> String {
    if e.is_dir {
        "DIR".to_string()
    } else {
        format_size(e.size)
    }
}

/// Aturan match nama — paritas logika lama (caseSensitive / exactMatch).
pub fn matches(name: &str, query: &str, case_sensitive: bool, exact: bool) -> bool {
    if !case_sensitive {
        let n = name.to_lowercase();
        let q = query.to_lowercase();
        return if exact { n == q } else { n.contains(&q) };
    }
    if exact {
        name == query
    } else {
        name.contains(query)
    }
}

/// Listing direktori non-rekursif (tanpa sort — caller pakai `sort_entries`).
/// Error dikembalikan sebagai `String` agar langsung tampil di status bar.
pub fn read_dir_entries(dir: &Path) -> Result<Vec<Entry>, String> {
    let rd = std::fs::read_dir(dir).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for item in rd {
        let Ok(item) = item else { continue };
        let name = item.file_name().to_string_lossy().to_string();
        let path = item.path();
        let (is_dir, size) = match std::fs::metadata(&path) {
            Ok(m) => (m.is_dir(), m.len()),
            Err(_) => (path.is_dir(), 0),
        };
        let modified = mtime_secs(&path);
        out.push(Entry {
            name,
            path,
            is_dir,
            size,
            modified,
        });
    }
    Ok(out)
}

/// Search paralel via `ignore` (multi-thread). Termasuk hidden files,
/// mengabaikan `.gitignore` (paritas perilaku versi lama).
/// Tanpa sort, dibatasi `MAX_RESULTS` — caller pakai `sort_entries`.
pub fn search_entries(root: &Path, query: &str, opts: &SearchOptions) -> Vec<Entry> {
    if query.is_empty() {
        return Vec::new();
    }
    let depth = if opts.recursive {
        MAX_DEPTH_RECURSIVE
    } else {
        1
    };
    let (tx, rx) = std::sync::mpsc::channel::<Entry>();

    let mut builder = WalkBuilder::new(root);
    builder
        .hidden(false)
        .git_ignore(false)
        .ignore(false)
        .parents(false)
        .git_global(false)
        .git_exclude(false)
        .max_depth(Some(depth))
        .threads(num_cpus())
        .filter_entry(|_| true);

    let count = std::sync::Arc::new(AtomicUsize::new(0));
    let query = query.to_string();

    builder.build_parallel().run(|| {
        let tx = tx.clone();
        let query = query.clone();
        let count = count.clone();
        let case = opts.case_sensitive;
        let exact = opts.exact;
        Box::new(move |res| {
            if count.load(Ordering::Relaxed) >= MAX_RESULTS {
                return WalkState::Quit;
            }
            let Ok(entry) = res else {
                return WalkState::Continue;
            };
            if entry.depth() == 0 {
                return WalkState::Continue; // lewati root itu sendiri
            }
            let name = entry.file_name().to_string_lossy().to_string();
            if !matches(&name, &query, case, exact) {
                return WalkState::Continue;
            }
            let path = entry.path().to_path_buf();
            let (is_dir, size) = match std::fs::metadata(&path) {
                Ok(m) => (m.is_dir(), m.len()),
                Err(_) => (entry.file_type().map(|t| t.is_dir()).unwrap_or(false), 0),
            };
            let modified = mtime_secs(&path);
            let prev = count.fetch_add(1, Ordering::Relaxed);
            if prev >= MAX_RESULTS {
                return WalkState::Quit;
            }
            let _ = tx.send(Entry {
                name,
                path,
                is_dir,
                size,
                modified,
            });
            WalkState::Continue
        })
    });
    drop(tx);

    let mut out: Vec<Entry> = rx.into_iter().collect();
    out.truncate(MAX_RESULTS);
    out
}

fn num_cpus() -> usize {
    std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
        .min(8)
}

fn mtime_secs(path: &Path) -> u64 {
    std::fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn name_lower(e: &Entry) -> String {
    e.name.to_lowercase()
}

/// Urutan tampil explorer — mode dari ComboBox: "Nama" | "Tipe" | "Ukuran" | "Terbaru".
/// "Nama"/"Tipe": folder dulu; "Ukuran": terbesar dulu; "Terbaru": termodif dulu.
pub fn sort_entries(entries: &mut Vec<Entry>, mode: &str) {
    match mode {
        "Tipe" => entries.sort_by(|a, b| {
            b.is_dir
                .cmp(&a.is_dir)
                .then(kind_rank(a).cmp(&kind_rank(b)))
                .then(name_lower(a).cmp(&name_lower(b)))
        }),
        "Ukuran" => {
            entries.sort_by(|a, b| b.size.cmp(&a.size).then(name_lower(a).cmp(&name_lower(b))))
        }
        "Terbaru" => entries.sort_by(|a, b| {
            b.modified
                .cmp(&a.modified)
                .then(name_lower(a).cmp(&name_lower(b)))
        }),
        _ => entries.sort_by(|a, b| {
            b.is_dir
                .cmp(&a.is_dir)
                .then(name_lower(a).cmp(&name_lower(b)))
        }),
    }
}

/// Peringkat tipe untuk sort "Tipe" (urutan grup ~ FILE_TYPES versi lama).
fn kind_rank(e: &Entry) -> u8 {
    match file_kind(&e.name, e.is_dir).0 {
        "folder" => 0,
        "image" => 1,
        "video" => 2,
        "audio" => 3,
        "doc" => 4,
        "code" => 5,
        "archive" => 6,
        "exe" => 7,
        "font" => 8,
        _ => 9,
    }
}

/// Jenis file untuk ikon + warna (port `FILE_TYPES` versi lama).
/// Return `(kind, tint_rgb)`; `kind` 1:1 dengan nama file di `ui/icons/`.
pub fn file_kind(file_name: &str, is_dir: bool) -> (&'static str, (u8, u8, u8)) {
    if is_dir {
        return ("folder", (251, 191, 36));
    }
    let ext = file_name
        .rfind('.')
        .map(|i| file_name[i + 1..].to_lowercase())
        .unwrap_or_default();
    match ext.as_str() {
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "svg" | "bmp" | "ico" | "tiff" | "avif" => {
            ("image", (52, 211, 153))
        }
        "mp4" | "mkv" | "avi" | "mov" | "wmv" | "flv" | "webm" | "m4v" => {
            ("video", (248, 113, 113))
        }
        "mp3" | "wav" | "ogg" | "flac" | "aac" | "m4a" | "wma" => ("audio", (167, 139, 250)),
        "pdf" | "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" | "odt" | "ods" | "odp"
        | "txt" | "rtf" => ("doc", (96, 165, 250)),
        "js" | "ts" | "jsx" | "tsx" | "html" | "css" | "php" | "py" | "java" | "c" | "cpp"
        | "cs" | "go" | "rs" | "rb" | "vue" | "json" | "xml" | "yaml" | "yml" | "sh" | "bat"
        | "sql" | "md" => ("code", (52, 211, 153)),
        "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" | "xz" | "cab" => ("archive", (251, 146, 60)),
        "exe" | "msi" | "apk" | "dmg" | "deb" | "rpm" => ("exe", (148, 163, 184)),
        "ttf" | "otf" | "woff" | "woff2" | "eot" => ("font", (232, 121, 249)),
        _ => ("file", (139, 145, 176)),
    }
}
