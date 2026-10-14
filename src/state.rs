//! State bersama UI ↔ backend.
//!
//! ATURAN:
//! - `AppStore` hanya data polos (`Arc<Mutex<…>>`) sehingga `Send`: boleh
//!   di-clone ke worker thread (lihat `on_ss_fetch` di `main.rs`).
//! - Model UI TIDAK disimpan di sini. Setiap tulis ke ListView WAJIB lewat
//!   `set_*` window dengan `VecModel` baru (replace). JANGAN simpan
//!   `Rc<VecModel>` di mana pun — tidak `Send` dan bikin model basi.
//! - Mapping ke struct Slint hanya di `to_row()` / `to_ss_row()` di sini.

use crate::fs::{entry_info, file_kind, Entry};
use crate::spreadsheet::{self, SsRow as SsDataRow, SsStatus};
use crate::{FileRow, MainWindow, SsRow as SsRowUi};
use slint::{Color, ModelRc, VecModel};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

#[derive(Clone, Default)]
pub struct AppStore {
    target: Arc<Mutex<Option<PathBuf>>>,
    current: Arc<Mutex<Option<PathBuf>>>,
    entries: Arc<Mutex<Vec<Entry>>>,
    ss_all: Arc<Mutex<Vec<SsDataRow>>>,
    ss_raw: Arc<Mutex<Vec<Vec<String>>>>,
}

/// Kolom grid view explorer. Sinkron dengan ukuran tile di
/// `ui/components/file_cell.slint` (120px + spacing 10px): 6 kolom
/// muat di lebar konten minimum (900px window − sidebar − padding).
pub const GRID_COLS: i32 = 6;

impl AppStore {
    pub fn new() -> Self {
        Self {
            target: Arc::new(Mutex::new(None)),
            current: Arc::new(Mutex::new(None)),
            entries: Arc::new(Mutex::new(Vec::new())),
            ss_all: Arc::new(Mutex::new(Vec::new())),
            ss_raw: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn set_target(&self, p: PathBuf) {
        *self.target.lock().unwrap() = Some(p);
    }

    pub fn get_target(&self) -> Option<PathBuf> {
        self.target.lock().unwrap().clone()
    }

    /// Folder yang sedang ditampilkan (masuk via klik baris/breadcrumb).
    pub fn set_current(&self, p: PathBuf) {
        *self.current.lock().unwrap() = Some(p);
    }

    pub fn get_current(&self) -> Option<PathBuf> {
        self.current.lock().unwrap().clone()
    }

    /// Tampilkan entries explorer ke ListView. Return jumlah baris.
    /// Sekaligus isi posisi grid (gcol/grow) untuk view-mode "grid".
    pub fn publish(&self, w: &MainWindow, entries: Vec<Entry>) -> usize {
        let rows: Vec<FileRow> = entries
            .iter()
            .enumerate()
            .map(|(i, e)| {
                let mut r = to_row(e);
                r.gcol = (i as i32) % GRID_COLS;
                r.grow = (i as i32) / GRID_COLS;
                r
            })
            .collect();
        let n = rows.len();
        *self.entries.lock().unwrap() = entries;
        w.set_results(ModelRc::new(VecModel::from(rows)));
        n
    }

    /// Ambil entry explorer by index ListView (untuk Buka/Lihat).
    pub fn get(&self, idx: usize) -> Option<Entry> {
        self.entries.lock().unwrap().get(idx).cloned()
    }

    /// Tampilkan hasil fetch spreadsheet (full, tanpa filter).
    /// Simpan juga baris mentah untuk cache. Return (baris, belum-lengkap).
    pub fn publish_ss(
        &self,
        w: &MainWindow,
        rows: Vec<SsDataRow>,
        raw: Vec<Vec<String>>,
    ) -> (usize, usize) {
        let view: Vec<SsRowUi> = rows.iter().map(to_ss_row).collect();
        let n = view.len();
        let incomplete = rows.iter().filter(|r| r.incomplete).count();
        *self.ss_all.lock().unwrap() = rows;
        *self.ss_raw.lock().unwrap() = raw;
        w.set_ss_results(ModelRc::new(VecModel::from(view)));
        (n, incomplete)
    }

    /// Filter tampilan spreadsheet by query + status.
    /// Return (tampil, total, belum-lengkap di hasil tampil).
    pub fn apply_ss_filter(
        &self,
        w: &MainWindow,
        query: &str,
        status: &SsStatus,
    ) -> (usize, usize, usize) {
        let all = self.ss_all.lock().unwrap();
        let filtered = spreadsheet::filter_rows(&all, query, status);
        let shown = filtered.len();
        let total = all.len();
        let incomplete = filtered.iter().filter(|r| r.incomplete).count();
        let view: Vec<SsRowUi> = filtered.iter().map(to_ss_row).collect();
        w.set_ss_results(ModelRc::new(VecModel::from(view)));
        (shown, total, incomplete)
    }

    pub fn cache_last_folder(&self) -> Option<String> {
        self.target
            .lock()
            .unwrap()
            .clone()
            .map(|p| p.to_string_lossy().to_string())
    }

    pub fn cache_ss_raw(&self) -> Vec<Vec<String>> {
        self.ss_raw.lock().unwrap().clone()
    }
}

/// Mapping Entry → baris Slint. Satu-satunya tempat mapping ini.
pub fn to_row(e: &Entry) -> FileRow {
    let (kind, (r, g, b)) = file_kind(&e.name, e.is_dir);
    FileRow {
        name: e.name.clone().into(),
        path: e.path.to_string_lossy().to_string().into(),
        info: entry_info(e).into(),
        is_dir: e.is_dir,
        kind: kind.into(),
        tint: Color::from_rgb_u8(r, g, b),
        gcol: 0,
        grow: 0,
    }
}

/// Mapping baris spreadsheet → struct Slint. Satu-satunya tempat mapping ini.
pub fn to_ss_row(r: &SsDataRow) -> SsRowUi {
    SsRowUi {
        c_no: r.no.clone().into(),
        c_kode: r.kode.clone().into(),
        c_name: r.name.clone().into(),
        c_cat: r.cat.clone().into(),
        c_uom: r.uom.clone().into(),
        c_p: r.p.clone().into(),
        c_l: r.l.clone().into(),
        c_t: r.t.clone().into(),
        c_b: r.b.clone().into(),
        row_incomplete: r.incomplete,
        warn_p: r.warn_p,
        warn_l: r.warn_l,
        warn_t: r.warn_t,
        warn_b: r.warn_b,
    }
}
