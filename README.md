# FolderScope Native — File Manager (Rust + Slint)

Rewrite native dari versi Electron lama: tanpa webview, tanpa Chromium.
Binary ~6-10MB, RAM ~40-60MB.

## Fitur (v0.1.0)

- Pilih folder target (dialog native) + listing sort A-Z.
- Search paralel multi-thread (recursive, case sensitive, exact match),
  max 500 hasil + waktu pencarian (ms), max depth 10.
- Buka file/folder via aplikasi default + "Lihat" di File Explorer.
- UI dark native (Slint, GPU).

## Prasyarat

1. Rust stable: `winget install Rustlang.Rustup`, lalu restart terminal.
2. Windows: VS Build Tools / VS Community dengan workload VCTools (linker MSVC).

## Jalankan

```powershell
cargo run
```

## Struktur

Lihat `.ai/RULES.md` (aturan kerja), `.ai/STRUCTURE.md` (struktur folder),
`.ai/UI.md` (komponen), `.ai/FUNCTIONS.md` (fungsi reusable),
`.ai/COMMANDS.md` (perintah cargo).

```
src/  → main.rs (wiring), state.rs (AppStore), fs.rs (baca/cari), actions.rs (aksi OS)
ui/   → app.slint (MainWindow), theme.slint (Theme), components/ (reusable)
```
