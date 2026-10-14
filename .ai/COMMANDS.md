# Perintah

Prasyarat: Rust stable + VS Build Tools (workload VCTools). Lihat README.

```powershell
cargo check        # verifikasi cepat (wajib lolos sebelum selesai)
cargo run          # jalankan aplikasi
cargo build        # build debug ke target/debug/
cargo build --release  # binary rilis ke target/release/
cargo fmt          # rapikan format Rust
cargo clean        # hapus target/ bila build aneh
```

Catatan:

- Build pertama lama (kompilasi dependensi Slint) — itu normal.
- `target/` tidak di-commit (lihat `.gitignore`).
- `Cargo.lock` di-commit (aplikasi binary).
