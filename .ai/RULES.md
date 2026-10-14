# Aturan Kerja AI — FolderScope Native (Rust + Slint, tanpa webview)

Baca file ini dulu sebelum mengubah apa pun. Detail ada di file lain folder ini.

## Stack

- Backend: Rust. UI: Slint (native, GPU). Tidak ada webview, tidak ada JS/HTML/CSS.
- Dokumen terkait: `STRUCTURE.md` (struktur folder), `UI.md` (komponen),
  `FUNCTIONS.md` (fungsi reusable), `COMMANDS.md` (perintah cargo).

## Invarian (jangan dilanggar)

1. Satu fitur = satu alur: `ui/components/*.slint` → property/callback di
   `MainWindow` (`ui/app.slint`) → wiring di `src/main.rs` → logika di
   `src/fs.rs` / `src/actions.rs` → state via `src/state.rs`.
2. Jangan taruh logika bisnis di `src/main.rs` (hanya wiring callback).
3. Jangan duplikasi fungsi yang sudah ada di `FUNCTIONS.md` — pakai yang ada
   atau tambah di modul yang benar, bukan file baru berdiri sendiri.
4. Jangan buat folder/top-level file baru tanpa update `STRUCTURE.md`.
5. Warna/ukuran UI hanya dari `Theme` (`ui/theme.slint`), jangan hardcode hex.
6. Batas perilaku dijaga: search max 500 hasil, depth max 10 (`src/fs.rs`).
7. Network (HTTP) tidak pernah di UI thread: worker thread +
   `slint::invoke_from_event_loop` (contoh: `on_ss_fetch` di `src/main.rs`).
   Hanya state `Send` (`String`, `Weak`, `AppStore`, closure `Arc`) yang boleh
   masuk thread. Model UI selalu ditulis di UI thread via `set_*`.
8. Setiap tambah/ubah fungsi reusable atau komponen, update `FUNCTIONS.md`
   atau `UI.md` di PR yang sama. Fitur lama yang sengaja ditunda dicatat di
   `BACKLOG.md`, bukan dibiarkan hilang.

## Alur tambah fitur (contoh: filter tipe file)

1. Tambah fungsi di modul yang tepat (`src/fs.rs`), bukan di `main.rs`.
2. Tambah komponen di `ui/components/` bila ada UI baru, compose di `app.slint`.
3. Wire callback di `src/main.rs` memakai `AppStore`.
4. Verifikasi: `cargo check` (lihat `COMMANDS.md`).
