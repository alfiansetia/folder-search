# Struktur Folder

```
.
├── build.rs               # kompilasi ui/app.slint (jangan ubah path tanpa update ini)
├── Cargo.toml / Cargo.lock
├── src/
│   ├── main.rs            # WIRING SAJA: callback UI → modul. Tanpa logika bisnis.
│   ├── state.rs           # AppStore: explorer + spreadsheet model & mapping.
│   ├── fs.rs              # read_dir_entries, search_entries, format_size, Entry.
│   ├── spreadsheet.rs     # parse_api_json, filter_rows, fetch_api, SsRow.
│   ├── cache.rs           # load_cache, save_cache (pengganti localStorage).
│   └── actions.rs         # open_entry, reveal_in_explorer, pick_folder_dialog.
├── ui/
│   ├── app.slint          # MainWindow: sidebar + 2 view + property/callback.
│   ├── theme.slint        # Global Theme: semua warna (gelap/terang).
│   ├── icons/             # SVG stroke-putih (folder, file, …); tampil via colorize.
│   └── components/
│       ├── file_row.slint # Struct FileRow + FileRowItem (list explorer).
│       ├── ss_row.slint   # Struct SsRow + SsHeader + SsRowItem (tabel SS).
│       ├── nav_button.slint, icon_button.slint  # Tombol sidebar + tombol ikon.
│       ├── check_row.slint, search_field.slint  # Checkbox + input teks bertema.
│       └── app_button.slint, app_combo.slint    # Tombol + dropdown bertema.
├── assets/
│   ├── icon.jpg           # Ikon aplikasi (JPEG — JANGAN rename ke .png).
│   └── icon.ico           # Multi-ukuran, dari icon.jpg via scripts/make-icon.ps1; di-embed ke exe (winres) + installer.
├── installer.iss          # Skrip installer Inno Setup 6 (output ke dist/).
├── scripts/
│   └── build-installer.ps1  # Build rilis + portable zip + installer.
├── docs/
│   └── BUILD.md           # Panduan build & installer.
├── CHANGELOG.md           # Riwayat versi (v2.0.0 = rewrite Rust+Slint).
└── .ai/                   # Aturan kerja (RULES/STRUCTURE/UI/FUNCTIONS/COMMANDS/BACKLOG).
```

## Tanggung jawab

| Path | Boleh | Dilarang |
|---|---|---|
| `src/main.rs` | `on_*` wiring, baca property, tulis status, spawn worker thread (hanya state `Send`: url, weak, store, save closure) | logika fs/ss, `open::that` langsung, `Rc<VecModel>`, fetch di UI thread |
| `src/state.rs` | `publish*()`, `get()`, `apply_ss_filter()`, `to_row/ss()` via `set_*` + `VecModel` baru | simpan model UI, `set_vec` pada handle lama |
| `src/fs.rs` | semua baca/cari file | akses UI/Slint |
| `src/spreadsheet.rs` | parse/filter/fetch API tabel | akses UI/Slint |
| `src/cache.rs` | load/save JSON lokal | akses UI/Slint |
| `src/actions.rs` | aksi OS + dialog | akses UI/Slint |
| `ui/app.slint` | sidebar, view switching, property, callback | layout detail baris (ke `components/`) |
| `ui/components/*` | 1 file = 1 komponen + struct-nya | warna hardcode (pakai `Theme`) |

## Tambah file baru

- Komponen UI baru → `ui/components/nama.slint`, import di `app.slint`.
- Fungsi fs/OS/ss/cache baru → fungsi baru di modul domainnya, BUKAN file
  baru, kecuali domain benar-benar beda + update file ini.
