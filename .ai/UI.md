# Komponen UI (Slint)

## Prinsip

- `ui/app.slint` hanya: sidebar, view switching (`current-view`), `in-out property`,
  `callback`. Detail tampilan selalu di `ui/components/<nama>.slint`.
- Warna selalu dari `Theme` (`ui/theme.slint`). Tema diganti dari Rust via
  `apply_theme()` di `src/main.rs` — jangan bikin palet kedua di Slint.
- Style std-widgets = `fluent-dark` (di `build.rs`), selaras tema gelap.

## Sistem ikon (tanpa webview, tanpa font ikon)

- Ikon = file SVG stroke putih di `ui/icons/` (gaya Lucide/Feather 24px).
- Tampilkan via `Image { source: @image-url("..."); colorize: <warna>; }`.
  `colorize` mewarnai ikon mengikuti `Theme` / tint tipe file.
- Path `@image-url` relatif terhadap file `.slint` yang memakai
  (`../icons/x.svg` dari `components/`, `icons/x.svg` dari `app.slint`).
  File hilang = error compile (build.rs), bukan runtime.
- Ikon dinamis (tipe file): Rust hitung `kind`+`tint` (`fs::file_kind`),
  Slint pilih file via rantai `if kind == "…"` (lihat `file_row.slint`).
  Jangan coba URL dinamis — `@image-url` butuh literal.
- Tombol butuh ikon+teks: pakai properti `icon` pada `Button` standar.

## View switching (sidebar)

```slint
in-out property <string> current-view: "explorer"; // "explorer" | "spreadsheet"
callback switch-view(string);
// Sidebar: checked: root.current-view == "explorer";
//          clicked => { root.switch-view("explorer"); }
// Konten:  if root.current-view == "explorer": VerticalBox { ... }
```

## Template komponen list baru (tiru `file_row.slint` / `ss_row.slint`)

```slint
import { Theme } from "../theme.slint";

export struct XyzRow { /* field data */ }

export component XyzItem inherits HorizontalLayout {
    in property <string> row-title;
    in property <int> row-index;
    callback activate-clicked(int);
    // event teruskan index ke parent:
    // clicked => { root.activate-clicked(root.row-index); }
}
```

Pakai di `app.slint`:

```slint
import { XyzRow, XyzItem } from "components/xyz.slint";
in-out property <[XyzRow]> xyz-results: [];
callback xyz-activate(int);
// ...
for row[idx] in root.xyz-results: XyzItem {
    row-title: row.title;
    row-index: idx;
    activate-clicked(i) => { root.xyz-activate(i); }
}
```

## Aturan property/callback/global

- State milik window: `in-out property`; input komponen: `in property`.
- Callback komponen: `<aksi>-clicked(int)` dengan index; callback window:
  `<aksi>-<objek>(int)` mis. `open-file(int)`.
- Global yang perlu diakses Rust (mis. `Theme` via `window.global::<Theme>()`)
  WAJIB di-re-export dari root: `export { Theme } from "theme.slint";`.
  `import` saja TIDAK cukup — tipenya tidak muncul di Rust.
- Dua arah (input teks/checkbox/combo): two-way binding `<=>` ke property
  window + handler (`accepted`/`edited`/`selected`) untuk aksi lanjutan.
- Lebar kolom tabel: definisikan SEKALI per file komponen (header + item
  harus sama, lihat `ss_row.slint`).

## Daftar komponen

- `FileRowItem` + `struct FileRow` (`components/file_row.slint`) — list explorer
  (ikon tipe via `kind`+`tint`, aksi via `IconButton`).
- `SsHeader`, `SsRowItem` + `struct SsRow` (`components/ss_row.slint`) — tabel SS.
- `NavButton` (`components/nav_button.slint`) — tombol sidebar ikon saja
  (label opsional: Text hanya tampil bila `label != ""`; ikon alternatif via
  `icon-alt`+`use-alt`).
- `IconButton` (`components/icon_button.slint`) — tombol ikon kecil (hover).
- `CheckRow` (`components/check_row.slint`) — checkbox bertema (pengganti
  `CheckBox` standar yang labelnya tak terbaca di mode Terang).
- Kandidat ekstrak berikutnya saat membesar: `top_bar.slint`, `search_bar.slint`.
