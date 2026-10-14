//! Aksi OS — pengganti `shell:openPath` dan `shell:showInExplorer` versi lama.
//!
//! ATURAN: semua interaksi "buka di luar aplikasi" WAJIB lewat sini,
//! jangan panggil `open::that` / `explorer` langsung dari `main.rs`.
//! Lihat juga `.ai/FUNCTIONS.md`.

use std::path::Path;

/// Buka file/folder dengan aplikasi default OS.
pub fn open_entry(path: &Path) -> Result<(), String> {
    open::that(path).map_err(|e| e.to_string())
}

/// Tampilkan file di File Explorer (Windows: select filenya).
pub fn reveal_in_explorer(path: &Path) {
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer")
            .arg("/select,")
            .arg(path)
            .spawn();
    }
    #[cfg(not(target_os = "windows"))]
    {
        if let Some(parent) = path.parent() {
            let _ = open::that(parent);
        }
    }
}

/// Dialog pilih folder. Return `None` bila user membatalkan.
pub fn pick_folder_dialog() -> Option<std::path::PathBuf> {
    rfd::FileDialog::new()
        .set_title("Pilih Folder Target")
        .pick_folder()
}
