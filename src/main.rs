//! FolderScope Native — entry point.
//!
//! ATURAN: file ini hanya wiring UI ↔ backend (callback → modul).
//! - Explorer baca/cari: `fs.rs`. Spreadsheet: `spreadsheet.rs`.
//! - Aksi OS + dialog: `actions.rs`. Cache lokal: `cache.rs`.
//! - State + mapping ke UI: `state.rs`.
//! - Network (fetch) WAJIB di worker thread + `invoke_from_event_loop`.
//!   `AppStore` itu `Send`, jadi boleh di-clone ke thread; `Rc<VecModel>`
//!   dilarang (lihat `state.rs`).
//! Jangan taruh logika bisnis di sini. Lihat `.ai/RULES.md`.

// Rilis: tanpa jendela konsol (aplikasi GUI murni). Debug tetap pakai
// konsol agar println!/panic terlihat saat `cargo run`.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

slint::include_modules!();

mod actions;
mod cache;
mod fs;
mod spreadsheet;
mod state;

use fs::SearchOptions;
use slint::{Color, Model, ModelRc, SharedString, VecModel};
use state::AppStore;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;

/// Terapkan palet gelap/terang ke global `Theme` (pengganti `applyTheme` lama).
fn apply_theme(w: &MainWindow, light: bool) {
    let t = w.global::<Theme>();
    if light {
        // Palet terang = variabel [data-theme="light"] style.css versi lama.
        t.set_bg_base(Color::from_rgb_u8(243, 244, 248));
        t.set_bg_surface(Color::from_rgb_u8(255, 255, 255));
        t.set_bg_elevated(Color::from_rgb_u8(237, 238, 244));
        t.set_bg_hover(Color::from_rgb_u8(225, 227, 235));
        t.set_border(Color::from_argb_u8(40, 0, 0, 0));
        t.set_accent(Color::from_rgb_u8(88, 86, 214));
        t.set_accent_light(Color::from_rgb_u8(79, 77, 208));
        t.set_accent_dim(Color::from_argb_u8(30, 88, 86, 214));
        t.set_text_primary(Color::from_rgb_u8(28, 30, 40));
        t.set_text_secondary(Color::from_rgb_u8(80, 84, 110));
        t.set_text_muted(Color::from_rgb_u8(130, 135, 160));
        t.set_warn(Color::from_rgb_u8(200, 30, 30));
        t.set_warn_bg(Color::from_argb_u8(35, 200, 30, 30));
        t.set_check_mark(Color::from_rgb_u8(255, 255, 255));
    } else {
        t.set_bg_base(Color::from_rgb_u8(13, 15, 20));
        t.set_bg_surface(Color::from_rgb_u8(20, 23, 32));
        t.set_bg_elevated(Color::from_rgb_u8(26, 29, 39));
        t.set_bg_hover(Color::from_rgb_u8(31, 34, 50));
        t.set_border(Color::from_argb_u8(25, 255, 255, 255));
        t.set_accent(Color::from_rgb_u8(99, 102, 241));
        t.set_accent_light(Color::from_rgb_u8(129, 140, 248));
        t.set_accent_dim(Color::from_argb_u8(38, 99, 102, 241));
        t.set_text_primary(Color::from_rgb_u8(232, 234, 246));
        t.set_text_secondary(Color::from_rgb_u8(139, 145, 176));
        t.set_text_muted(Color::from_rgb_u8(78, 82, 112));
        t.set_warn(Color::from_rgb_u8(248, 113, 113));
        t.set_warn_bg(Color::from_argb_u8(31, 248, 113, 113));
        t.set_check_mark(Color::from_rgb_u8(255, 255, 255));
    }
}

/// Direktori yang sedang ditampilkan (bisa masuk ke subfolder).
/// Fallback ke target bila belum pernah navigasi.
fn current_dir(store: &AppStore) -> Option<PathBuf> {
    store.get_current().or_else(|| store.get_target())
}

/// Nama folder untuk breadcrumb (file_name; root drive pakai full path).
fn dir_display_name(p: &Path) -> String {
    p.file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| p.to_string_lossy().to_string())
}

/// Susun crumbs target → current untuk breadcrumb UI.
fn refresh_crumbs(w: &MainWindow, store: &AppStore) {
    let mut names: Vec<SharedString> = Vec::new();
    if let Some(target) = store.get_target() {
        names.push(dir_display_name(&target).into());
        if let Some(cur) = store.get_current() {
            if let Ok(rel) = cur.strip_prefix(&target) {
                for comp in rel.components() {
                    names.push(comp.as_os_str().to_string_lossy().to_string().into());
                }
            }
        }
    }
    w.set_crumbs(ModelRc::new(VecModel::from(names)));
}

/// Baca folder saat ini + sort + tampilkan (satu-satunya jalur listing explorer).
fn show_dir_listing(w: &MainWindow, store: &AppStore) {
    let Some(dir) = current_dir(store) else {
        w.set_status_text("Pilih folder target dulu.".into());
        return;
    };
    refresh_crumbs(w, store);
    match fs::read_dir_entries(&dir) {
        Ok(mut entries) => {
            fs::sort_entries(&mut entries, &w.get_sort_mode());
            let n = store.publish(w, entries);
            w.set_status_text(format!("{} entri di folder ini.", n).into());
        }
        Err(e) => w.set_status_text(format!("Gagal baca folder: {}", e).into()),
    }
}

/// Cari + sort + tampilkan (satu-satunya jalur search explorer).
/// Search SELALU dari folder target (root), bukan dari posisi breadcrumb.
fn run_search(w: &MainWindow, store: &AppStore) {
    let Some(dir) = store.get_target() else {
        w.set_status_text("Pilih folder target dulu.".into());
        return;
    };
    let q = w.get_search_query().to_string();
    if q.trim().is_empty() {
        w.set_is_search_mode(false);
        show_dir_listing(w, store);
        return;
    }
    w.set_is_search_mode(true);
    let opts = SearchOptions {
        recursive: w.get_opt_recursive(),
        case_sensitive: w.get_opt_case(),
        exact: w.get_opt_exact(),
    };
    let t0 = Instant::now();
    let mut found = fs::search_entries(&dir, &q, &opts);
    fs::sort_entries(&mut found, &w.get_sort_mode());
    let ms = t0.elapsed().as_millis();
    let n = store.publish(w, found);
    w.set_status_text(format!("{} hasil untuk \"{}\" • {} ms", n, q, ms).into());
}

fn main() -> Result<(), slint::PlatformError> {
    let window = MainWindow::new()?;
    let store = AppStore::new();
    let is_light = Arc::new(AtomicBool::new(false));
    window.set_results(ModelRc::new(VecModel::from(Vec::<FileRow>::new())));
    window.set_ss_results(ModelRc::new(VecModel::from(Vec::<SsRow>::new())));

    // Simpan cache: dipanggil setelah pilih folder / fetch sukses / ganti tema.
    // Hanya menangkap state `Send`, jadi boleh dipakai dari worker thread.
    let save_now = {
        let store = store.clone();
        let is_light = is_light.clone();
        move |w: &MainWindow| {
            cache::save_cache(&cache::AppCache {
                last_folder: store.cache_last_folder(),
                ss_url: w.get_ss_url().to_string(),
                ss_data: store.cache_ss_raw(),
                theme: if is_light.load(Ordering::Relaxed) {
                    "light"
                } else {
                    "dark"
                }
                .to_string(),
            });
        }
    };

    // ── Navigasi sidebar (pengganti switchView lama) ──
    {
        let handle = window.as_weak();
        window.on_switch_view(move |v| {
            if let Some(w) = handle.upgrade() {
                w.set_current_view(v);
            }
        });
    }

    // ── Toggle tema ──
    {
        let handle = window.as_weak();
        let is_light = is_light.clone();
        let save_now = save_now.clone();
        window.on_toggle_theme(move || {
            let Some(w) = handle.upgrade() else { return };
            let light = !is_light.load(Ordering::Relaxed);
            is_light.store(light, Ordering::Relaxed);
            apply_theme(&w, light);
            w.set_is_light(light);
            w.set_theme_label(if light { "Terang" } else { "Gelap" }.into());
            save_now(&w);
        });
    }

    // ── Pilih folder ──
    {
        let handle = window.as_weak();
        let store = store.clone();
        let save_now = save_now.clone();
        window.on_pick_folder(move || {
            let Some(w) = handle.upgrade() else { return };
            let Some(dir) = actions::pick_folder_dialog() else {
                return;
            };
            store.set_target(dir.clone());
            store.set_current(dir.clone());
            w.set_target_folder(dir.to_string_lossy().to_string().into());
            show_dir_listing(&w, &store);
            save_now(&w);
        });
    }

    // ── Refresh ──
    {
        let handle = window.as_weak();
        let store = store.clone();
        window.on_refresh(move || {
            let Some(w) = handle.upgrade() else { return };
            show_dir_listing(&w, &store);
        });
    }

    // ── Cari file ──
    {
        let handle = window.as_weak();
        let store = store.clone();
        window.on_do_search(move || {
            let Some(w) = handle.upgrade() else { return };
            run_search(&w, &store);
        });
    }

    // ── Reset cari ──
    {
        let handle = window.as_weak();
        let store = store.clone();
        window.on_clear_search(move || {
            let Some(w) = handle.upgrade() else { return };
            w.set_search_query("".into());
            w.set_is_search_mode(false);
            show_dir_listing(&w, &store);
        });
    }

    // ── Ganti urutan tampil ──
    {
        let handle = window.as_weak();
        let store = store.clone();
        window.on_sort_changed(move || {
            let Some(w) = handle.upgrade() else { return };
            if w.get_is_search_mode() && !w.get_search_query().trim().is_empty() {
                run_search(&w, &store);
            } else {
                w.set_is_search_mode(false);
                show_dir_listing(&w, &store);
            }
        });
    }

    // ── Klik baris/tile: folder → masuk, file → buka default OS ──
    {
        let handle = window.as_weak();
        let store = store.clone();
        window.on_enter_row(move |idx| {
            let Some(w) = handle.upgrade() else { return };
            let Some(e) = store.get(idx as usize) else {
                return;
            };
            if e.is_dir {
                store.set_current(e.path);
                w.set_is_search_mode(false);
                w.set_search_query("".into());
                show_dir_listing(&w, &store);
            } else if let Err(err) = actions::open_entry(&e.path) {
                w.set_status_text(format!("Gagal buka: {}", err).into());
            }
        });
    }

    // ── Klik breadcrumb: naik ke level itu (0 = folder target) ──
    {
        let handle = window.as_weak();
        let store = store.clone();
        window.on_nav_crumb(move |level| {
            let Some(w) = handle.upgrade() else { return };
            let Some(target) = store.get_target() else {
                return;
            };
            let mut path = target;
            for seg in w.get_crumbs().iter().skip(1).take(level as usize) {
                path.push(seg.as_str());
            }
            store.set_current(path);
            w.set_is_search_mode(false);
            w.set_search_query("".into());
            show_dir_listing(&w, &store);
        });
    }

    // ── Buka file/folder ──
    {
        let handle = window.as_weak();
        let store = store.clone();
        window.on_open_file(move |idx| {
            let Some(w) = handle.upgrade() else { return };
            let Some(e) = store.get(idx as usize) else {
                return;
            };
            if let Err(err) = actions::open_entry(&e.path) {
                w.set_status_text(format!("Gagal buka: {}", err).into());
            }
        });
    }

    // ── Lihat di Explorer ──
    {
        let store = store.clone();
        window.on_reveal_file(move |idx| {
            let Some(e) = store.get(idx as usize) else {
                return;
            };
            actions::reveal_in_explorer(&e.path);
        });
    }

    // ── Fetch spreadsheet (worker thread, pengganti btn-fetch-api lama) ──
    {
        let handle = window.as_weak();
        window.on_ss_fetch({
            let store = store.clone();
            let save_now = save_now.clone();
            move || {
                let Some(w) = handle.upgrade() else { return };
                if w.get_ss_loading() {
                    return;
                }
                let url = w.get_ss_url().to_string();
                if url.trim().is_empty() {
                    w.set_ss_status_text("Masukkan URL API dulu!".into());
                    return;
                }
                w.set_ss_loading(true);
                w.set_ss_status_text("Sedang menarik data…".into());
                // Hanya state `Send` yang boleh masuk thread: url, weak,
                // store (Arc), save_now (Arc). Model UI ditulis di UI thread.
                // Clone di dalam body karena callback ini FnMut (bisa dipanggil ulang).
                let weak = handle.clone();
                let store = store.clone();
                let save_now = save_now.clone();
                std::thread::spawn(move || {
                    let result =
                        spreadsheet::fetch_api(&url).and_then(|v| spreadsheet::parse_api_json(&v));
                    let _ = slint::invoke_from_event_loop(move || {
                        let Some(w) = weak.upgrade() else { return };
                        w.set_ss_loading(false);
                        match result {
                            Ok((rows, raw)) => {
                                let (n, bad) = store.publish_ss(&w, rows, raw);
                                w.set_ss_status_text(
                                    format!("{} baris • {} belum lengkap", n, bad).into(),
                                );
                                save_now(&w);
                            }
                            Err(e) => {
                                w.set_ss_status_text(format!("Gagal memuat data: {}", e).into())
                            }
                        }
                    });
                });
            }
        });
    }

    // ── Filter spreadsheet (live, pengganti renderFilteredSS lama) ──
    {
        let handle = window.as_weak();
        let store = store.clone();
        window.on_ss_apply_filter(move || {
            let Some(w) = handle.upgrade() else { return };
            let q = w.get_ss_query().to_string();
            let st = spreadsheet::status_from_label(&w.get_ss_status_label());
            let (shown, total, bad) = store.apply_ss_filter(&w, &q, &st);
            w.set_ss_status_text(
                format!("{} dari {} • {} belum lengkap", shown, total, bad).into(),
            );
        });
    }

    // ── Init: muat cache lokal (pengganti init + initSSCache lama) ──
    {
        let c = cache::load_cache();
        let light = c.theme == "light";
        is_light.store(light, Ordering::Relaxed);
        apply_theme(&window, light);
        window.set_is_light(light);
        window.set_theme_label(if light { "Terang" } else { "Gelap" }.into());

        if let Some(folder) = c.last_folder {
            let p = std::path::PathBuf::from(&folder);
            if p.is_dir() {
                if let Ok(mut entries) = fs::read_dir_entries(&p) {
                    store.set_target(p.clone());
                    store.set_current(p);
                    window.set_target_folder(folder.into());
                    fs::sort_entries(&mut entries, &window.get_sort_mode());
                    let n = store.publish(&window, entries);
                    refresh_crumbs(&window, &store);
                    window.set_status_text(format!("{} entri di folder ini.", n).into());
                }
            }
        }
        if !c.ss_url.trim().is_empty() {
            window.set_ss_url(c.ss_url.into());
        }
        if !c.ss_data.is_empty() {
            let rows: Vec<spreadsheet::SsRow> = c
                .ss_data
                .iter()
                .map(|r| spreadsheet::row_from_raw(r))
                .collect();
            let (n, bad) = store.publish_ss(&window, rows, c.ss_data);
            window.set_ss_status_text(
                format!("{} baris dari cache • {} belum lengkap", n, bad).into(),
            );
        }
    }

    window.run()
}
