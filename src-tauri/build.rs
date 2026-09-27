fn main() {
    let icons = [
        "icons/icon.svg",
        "icons/icon.png",
        "icons/icon.icns",
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
    ];
    for path in icons {
        println!("cargo:rerun-if-changed={path}");
    }
    tauri_build::build()
}
