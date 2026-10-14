//! Persistensi lokal — pengganti `localStorage` versi Electron lama.
//!
//! - `cached_root_path` (`app.js:563`) → `last_folder`.
//! - `cached_ss_data`/`cached_ss_url` (`app.js:893`) → `ss_data`/`ss_url`.
//! - `app-theme` (`app.js:983`) → `theme` ("dark"/"light").
//!
//! File: `<cache_dir>/folderscope/cache.json` (Windows: %LOCALAPPDATA%).
//! Gagal baca → default kosong (jangan crash). Gagal tulis → abaikan.
//! Lihat juga `.ai/FUNCTIONS.md`.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct AppCache {
    #[serde(default)]
    pub last_folder: Option<String>,
    #[serde(default)]
    pub ss_url: String,
    #[serde(default)]
    pub ss_data: Vec<Vec<String>>,
    #[serde(default)]
    pub theme: String,
}

fn cache_path() -> Option<PathBuf> {
    dirs::cache_dir().map(|d| d.join("folderscope").join("cache.json"))
}

/// Muat cache saat startup. Selalu sukses (kosong bila belum ada/rusak).
pub fn load_cache() -> AppCache {
    let Some(path) = cache_path() else {
        return AppCache::default();
    };
    let Ok(text) = std::fs::read_to_string(&path) else {
        return AppCache::default();
    };
    serde_json::from_str(&text).unwrap_or_default()
}

/// Simpan cache. Dipanggil setelah: pilih folder, fetch sukses, ganti tema.
pub fn save_cache(cache: &AppCache) {
    let Some(path) = cache_path() else { return };
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(text) = serde_json::to_string_pretty(cache) {
        let _ = std::fs::write(&path, text);
    }
}
