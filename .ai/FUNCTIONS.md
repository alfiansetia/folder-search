# Fungsi Reusable

Jangan tulis ulang yang sudah ada. Import dari modulnya.

## `src/fs.rs` — filesystem

- `struct Entry { name, path, is_dir, size, modified }` (`modified` = detik
  epoch mtime, 0 bila tak terbaca — untuk sort "Terbaru").
- `sort_entries(&mut Vec<Entry>, mode: &str)` — mode ComboBox "Nama" (folder
  dulu, A-Z), "Tipe" (folder dulu, grup tipe, A-Z), "Ukuran" (terbesar dulu),
  "Terbaru" (termodif dulu). Satu-satunya tempat sorting explorer.
- `const MAX_RESULTS: usize = 500`, `const MAX_DEPTH_RECURSIVE: usize = 10`.
- `read_dir_entries(dir: &Path) -> Result<Vec<Entry>, String>` — listing
  non-rekursif, sort A-Z case-insensitive. Error = `String` siap tampil.
- `struct SearchOptions { recursive, case_sensitive, exact: bool }`
- `search_entries(root: &Path, query: &str, opts: &SearchOptions) -> Vec<Entry>`
  — paralel (`ignore`), termasuk hidden, abaikan `.gitignore`, max
  `MAX_RESULTS`, sort A-Z. Query kosong → `vec![]`.
- `matches(name, query, case_sensitive, exact) -> bool`.
- `file_kind(file_name: &str, is_dir: bool) -> (&'static str, (u8,u8,u8))` —
  port `FILE_TYPES` lama (folder/image/video/audio/doc/code/archive/exe/font/
  file). `kind` 1:1 dengan nama file di `ui/icons/`.
- `format_size(u64) -> String`, `entry_info(&Entry) -> String`.

## `src/spreadsheet.rs` — tabel API

- `struct SsRow { no,kode,name,cat,uom,p,l,t,b: String, incomplete: bool, warn_p,warn_l,warn_t,warn_b: bool, .. }` — baris siap tampil.
- `parse_api_json(data: &Value) -> Result<(Vec<SsRow>, Vec<Vec<String>>), String>` — terima Array / Object-berisi-Array; kembalikan baris tampil + mentah (mentah untuk cache).
- `row_from_raw(raw: &[String]) -> SsRow` — dipakai juga saat load cache.
- `enum SsStatus { All, Complete, Incomplete }`, `status_from_label(&str)` (label ComboBox "Semua"/"Lengkap"/"Tidak Lengkap").
- `filter_rows(&[SsRow], query: &str, status: &SsStatus) -> Vec<SsRow>`.
- `fetch_api(url: &str) -> Result<Value, String>` — blocking, HANYA dari worker thread.

## `src/cache.rs` — persistensi lokal (pengganti localStorage)

- `struct AppCache { last_folder: Option<String>, ss_url: String, ss_data: Vec<Vec<String>>, theme: String }` — file `<cache_dir>/folderscope/cache.json`.
- `load_cache() -> AppCache` — selalu sukses (default bila belum ada/rusak).
- `save_cache(&AppCache)` — panggil setelah: pilih folder, fetch sukses, ganti tema.

## `src/main.rs` — helper wiring (bukan logika bisnis)

- `show_dir_listing(&MainWindow, &AppStore)` — satu-satunya jalur listing
  folder (baca + sort + publish + status). Dipakai pick/refresh/clear/sort/init.
- `run_search(&MainWindow, &AppStore)` — satu-satunya jalur search
  (baca/telusuri + sort + publish + status + flag `is-search-mode`).

## `src/actions.rs` — aksi OS

- `open_entry(path: &Path) -> Result<(), String>`.
- `reveal_in_explorer(path: &Path)`.
- `pick_folder_dialog() -> Option<PathBuf>` (`None` = batal).

## `src/state.rs` — state UI (thread-safe)

- `AppStore` hanya data polos (`Arc<Mutex<…>>`) sehingga `Send`: boleh
  di-clone ke worker thread. TIDAK menyimpan model UI.
- Tulis ke ListView selalu via `set_*` window + `VecModel` baru (replace),
  bukan `set_vec` pada handle lama. JANGAN simpan `Rc<VecModel>` di mana
  pun (tidak `Send`, bikin model basi).
- `publish(&MainWindow, entries) -> usize`, `get(idx) -> Option<Entry>`.
- `publish_ss(&MainWindow, rows, raw) -> (baris, belum-lengkap)`,
  `apply_ss_filter(&MainWindow, query, status) -> (tampil, total, belum-lengkap)`.
- `set_target/get_target`, `cache_last_folder()`, `cache_ss_raw()`.
- `to_row(&Entry)`, `to_ss_row(&SsRow)` — satu-satunya mapping ke Slint.

## Tambah fungsi baru

1. Taruh di modul domainnya, dengan doc comment.
2. Error user-facing selalu `String`, bukan error mentah.
3. Network selalu blocking + worker thread + `invoke_from_event_loop`.
4. Daftarkan di file ini (nama + signature + 1 baris guna).
