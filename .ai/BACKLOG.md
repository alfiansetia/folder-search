# Backlog (fitur app lama yang belum di-port)

Sumber: `renderer/app.js` + `renderer/index.html` versi Electron (lihat git
history). Kerjakan sesuai prioritas bila diminta.

1. **Grid/List + sort + filter chips explorer** (`app.js:232,826,840,846`) —
   `viewMode`, `sortBy`, `filterType` + `FILE_TYPES`; butuh komponen grid +
   filter di `ui/components/`, state di `state.rs`.
2. **Navigasi folder dalam root** (`app.js:805`) — `currentPath`, history,
   breadcrumb, tombol Up; batasi tidak keluar dari `rootPath`.
3. **Live search debounce 300ms** (`app.js:789`) — ganti Enter manual.
4. **Context menu + copy path** (`index.html:472`) — menu klik kanan per baris.
5. **Stats sidebar** (`index.html:314`) — hitung folder/file/total size.
6. **Toast notifikasi** — ganti status-text untuk error penting.
7. **Window controls custom** (`main.js` lama: minimize/maximize/close) —
   perlu jendela frameless Slint; tidak prioritas di native.
