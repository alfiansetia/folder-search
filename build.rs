fn main() {
    // Style gelap untuk std-widgets (LineEdit/Button/ComboBox/CheckBox),
    // selaras dengan tema dark default aplikasi (pengganti Bootstrap dark).
    // Catatan: style ini compile-time; komponen custom bertema (app_button,
    // app_combo, search_field, check_row) selalu ikut Theme di kedua mode.
    let config = slint_build::CompilerConfiguration::new().with_style("fluent-dark".into());
    slint_build::compile_with_config("ui/app.slint", config).expect("slint compile failed");

    // Windows: embed ikon exe + info versi (agar tidak blank icon di
    // Explorer maupun di hasil installer). Sumber: assets/icon.ico
    // (dibuat dari assets/icon.jpg via scripts/make-icon.ps1).
    #[cfg(windows)]
    {
        let mut res = winres::WindowsResource::new();
        res.set_icon("assets/icon.ico");
        res.set("ProductName", "FolderScope");
        res.set(
            "FileDescription",
            "FolderScope 2.0 - file manager + spreadsheet viewer",
        );
        res.compile().expect("winres failed");
    }
}
