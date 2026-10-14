# Build & Installer — FolderScope 2.0

## Prasyarat

1. Rust stable: `winget install Rustlang.Rustup`, lalu restart terminal.
2. Windows: VS Build Tools / VS Community dengan workload VCTools (linker MSVC).
3. Untuk installer `.exe`: Inno Setup 6: `winget install JRSoftware.InnoSetup`
   (tanpa ini tetap bisa menghasilkan paket portable `.zip`).

## Jalankan (dev)

```powershell
cargo run
```

## Build rilis

```powershell
cargo build --release
# hasil: target\release\folderscope.exe
```

Build pertama lama (kompilasi dependensi Slint) — itu normal.
`cargo check` wajib lolos sebelum build.

## Paket + installer (disarankan)

Satu skrip mengerjakan semuanya — build rilis, ZIP portable, dan
installer Inno Setup bila `ISCC` tersedia:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-installer.ps1
```

Hasil di `dist/` (tidak di-commit, lihat `.gitignore`):

| File | Keterangan |
|---|---|
| `FolderScope-2.0.0-portable.zip` | `folderscope.exe` siap jalan tanpa install |
| `FolderScope-Setup-2.0.0.exe` | installer Windows (butuh Inno Setup) |

Skrip membaca versi dari `Cargo.toml`, jadi cukup bump versi di sana
(+ `#define MyAppVersion` di `installer.iss`) untuk rilis berikutnya.
Jalankan ulang dengan `-SkipBuild` bila exe sudah dibuild dan hanya
ingin mengemas ulang.

## Rilis versi baru

1. Bump `version` di `Cargo.toml` + `MyAppVersion` di `installer.iss`.
2. Tambah entri di `CHANGELOG.md`.
3. `cargo check`, lalu `scripts/build-installer.ps1`.
4. Commit + tag: `git tag v2.0.0`, push termasuk tag-nya.

## Catatan

- Binary rilis tidak butuh runtime tambahan (tanpa webview/Chromium).
- Binary rilis tanpa jendela konsol (GUI murni via `windows_subsystem`);
  `cargo run` (debug) tetap menampilkan konsol untuk log.
- Ikon window diambil dari `assets/icon.jpg`.
- Ikon file exe + installer dari `assets/icon.ico` (dibuat ulang via
  `scripts/make-icon.ps1` bila ganti ikon, lalu rebuild).
- `target/` dan `dist/` tidak di-commit.
