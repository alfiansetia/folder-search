# FolderScope 2.0 — File Manager + Spreadsheet Viewer (Rust + Slint)

Rewrite native dari v1 (Electron): tanpa webview, tanpa Chromium.
Binary ±10MB, RAM ±40-60MB. Lihat `CHANGELOG.md` untuk riwayat versi.

## Fitur (v2.0.0)

- Explorer: pilih folder target (dialog native) + listing sortir
  (Nama/Tipe/Ukuran/Terbaru), drill-down folder + breadcrumb,
  toggle list/grid.
- Search multi-thread (recursive, case sensitive, exact match),
  max 500 hasil + waktu pencarian (ms), max depth 10.
- Buka file/folder via aplikasi default + "Lihat" di File Explorer.
- Spreadsheet viewer: tarik JSON Array dari URL API + filter live,
  cache lokal (folder terakhir, URL, data, tema).
- Tema Gelap/Terang + UI dark native (Slint, GPU).

## Prasyarat

1. Rust stable: `winget install Rustlang.Rustup`, lalu restart terminal.
2. Windows: VS Build Tools / VS Community dengan workload VCTools (linker MSVC).

## Jalankan

```powershell
cargo run
```

## Build & Installer

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-installer.ps1
```

Menghasilkan `dist/FolderScope-2.0.0-portable.zip` (tanpa dependensi
tambahan) dan `dist/FolderScope-Setup-2.0.0.exe` (butuh Inno Setup 6:
`winget install JRSoftware.InnoSetup`). Panduan lengkap: `docs/BUILD.md`.

## Struktur

Lihat `.ai/RULES.md` (aturan kerja), `.ai/STRUCTURE.md` (struktur folder),
`.ai/UI.md` (komponen), `.ai/FUNCTIONS.md` (fungsi reusable),
`.ai/COMMANDS.md` (perintah cargo).

```
src/  → main.rs (wiring), state.rs (AppStore), fs.rs (baca/cari), actions.rs (aksi OS)
ui/   → app.slint (MainWindow), theme.slint (Theme), components/ (reusable)
```
