fn main() {
    // Style gelap untuk std-widgets (LineEdit/Button/ComboBox/CheckBox),
    // selaras dengan tema dark default aplikasi (pengganti Bootstrap dark).
    // Catatan: style ini compile-time; mode Terang tetap pakai widget gelap
    // (lihat .ai/BACKLOG.md).
    let config = slint_build::CompilerConfiguration::new().with_style("fluent-dark".into());
    slint_build::compile_with_config("ui/app.slint", config).expect("slint compile failed");
}
