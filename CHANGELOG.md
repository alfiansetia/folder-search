# Changelog — FolderScope

## [2.0.1]

- Spreadsheet: kolom KODE tanpa batas potong — teks panjang wrap
  penuh (sebelumnya fix 100px + elide "…").
- Explorer: search selalu dari folder target (root), bukan dari
  posisi breadcrumb/subfolder aktif.
- Explorer: perbaiki list kedip/refresh berulang — timer debounce
  di-stop saat Cari/Reset/Enter, dan timer sisa diabaikan bila query
  kosong di luar search-mode (mis. setelah masuk folder/breadcrumb).

## [2.0.0] — rewrite native

Rewrite penuh dari v1 (Electron) ke Rust + Slint: tanpa webview,
tanpa Chromium. Binary ±10MB, RAM ±40-60MB.

### Fitur

- Explorer: pilih folder target (dialog native), listing + sortir
  (Nama/Tipe/Ukuran/Terbaru).
- Search multi-thread (recursive, case sensitive, exact match),
  max 500 hasil + waktu pencarian (ms), max depth 10.
- Buka file/folder via aplikasi default + "Lihat" di File Explorer.
- Spreadsheet viewer: tarik JSON Array dari URL API, filter live
  (teks + status Lengkap/Tidak Lengkap), cache lokal.
- Tema Gelap/Terang, tersimpan di cache lokal bersama folder
  terakhir + URL + data spreadsheet.

### Perbaikan UI

- Semua input (search, checkbox, tombol, dropdown) komponen bertema
  custom — terbaca di mode Gelap maupun Terang.
- Judul window "FolderScope" + ikon aplikasi.
- Tombol aksi baris (Buka/Lihat) bisa diklik (perbaikan TouchArea
  yang menelan klik).
- Search explorer live saat mengetik (debounce 350ms) seperti filter
  sheet — tanpa perlu klik Cari/Enter.
- Navigasi drill-down: klik baris/tile folder untuk masuk, breadcrumb
  klik untuk naik level; search berjalan dari posisi saat ini.
- Toggle tampilan explorer list/grid (tile 6 kolom + scroll).
- Layout 3 kolom (sidebar | panel tools | konten): search/filter/sort
  pindah ke panel samping, konten khusus breadcrumb + hasil.
- Esc di input cari (explorer + filter sheet) = kosongkan + reset hasil,
  fokus tetap sehingga langsung bisa ketik query baru.
- Build rilis tanpa jendela konsol (GUI murni); debug tetap
  pakai konsol agar log terlihat.

## [1.0.0] — versi Electron (lama)

- Tag `v1`: aplikasi Electron/Bootstrap awal (riwayat git sebelum rewrite).
