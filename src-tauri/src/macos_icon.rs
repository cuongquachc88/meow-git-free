//! macOS `tauri dev` embeds `icon.icns` at compile time; Dock can keep a stale icon until we set it again from PNG.

#[cfg(target_os = "macos")]
pub fn refresh_dock_icon_from_embedded_png() {
  use objc2::{AllocAnyThread, MainThreadMarker};
  use objc2_app_kit::{NSApplication, NSImage};
  use objc2_foundation::NSData;

  let png = include_bytes!("../icons/128x128@2x.png");
  let mtm = unsafe { MainThreadMarker::new_unchecked() };
  let app = NSApplication::sharedApplication(mtm);
  let data = NSData::with_bytes(png);
  let Some(app_icon) = (unsafe { NSImage::initWithData(NSImage::alloc(), &data) }) else {
    return;
  };
  unsafe { app.setApplicationIconImage(Some(&app_icon)) };
}

#[cfg(not(target_os = "macos"))]
pub fn refresh_dock_icon_from_embedded_png() {}
