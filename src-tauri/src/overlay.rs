#[cfg(target_os = "macos")]
use cocoa::appkit::NSWindowCollectionBehavior;
#[cfg(target_os = "macos")]
use log::{debug, warn};
use tauri::{Runtime, WebviewWindow};
#[cfg(target_os = "macos")]
use tauri_nspanel::WebviewWindowExt;

// NSStatusWindowLevel: above a fullscreen game window, below system UI.
#[cfg(target_os = "macos")]
const OVERLAY_WINDOW_LEVEL: i32 = 25;

// NSWindowStyleMaskNonactivatingPanel: the panel can become key without
// activating the app, so clicking the overlay does not pull the game out of
// focus.
#[cfg(target_os = "macos")]
const NONACTIVATING_PANEL_MASK: u64 = 1 << 7;

// macOS moves a fullscreen app into its own Space, and recent macOS versions
// only display windows of other apps there when they are NSPanels with the
// CanJoinAllSpaces + FullScreenAuxiliary collection behaviors. `alwaysOnTop`
// alone (a plain NSWindow at NSFloatingWindowLevel) is never shown above the
// fullscreen game, so the window is converted to a non-activating panel.
#[cfg(target_os = "macos")]
pub fn float_above_fullscreen<R: Runtime>(window: &WebviewWindow<R>) {
    let target = window.clone();

    let run = window.run_on_main_thread(move || {
        let style_mask = match target.ns_window() {
            Ok(ptr) => unsafe { (*(ptr as *const objc2_app_kit::NSWindow)).styleMask().0 as u64 },
            Err(err) => {
                warn!(
                    "[Overlay] failed to get NSWindow for {}: {err}",
                    target.label()
                );
                return;
            }
        };

        let panel = match target.to_panel() {
            Ok(panel) => panel,
            Err(err) => {
                warn!(
                    "[Overlay] failed to convert {} to NSPanel: {err}",
                    target.label()
                );
                return;
            }
        };

        // Keep the window's own style bits (titled, resizable, ...) and only
        // add the non-activating panel one.
        panel.set_style_mask((style_mask | NONACTIVATING_PANEL_MASK) as i32);
        panel.set_collection_behaviour(
            NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
                | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary,
        );
        panel.set_level(OVERLAY_WINDOW_LEVEL);
        // NSPanel hides itself when the app deactivates by default, which is
        // exactly when the game is focused.
        panel.set_hides_on_deactivate(false);
        panel.set_becomes_key_only_if_needed(true);

        debug!("[Overlay] {} converted to overlay panel", target.label());
    });

    if let Err(err) = run {
        warn!("[Overlay] failed to schedule on main thread: {err}");
    }
}

#[cfg(not(target_os = "macos"))]
pub fn float_above_fullscreen<R: Runtime>(_window: &WebviewWindow<R>) {}
