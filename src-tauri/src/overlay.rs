#[cfg(target_os = "macos")]
use log::{debug, warn};
use tauri::{Runtime, WebviewWindow};
#[cfg(target_os = "macos")]
use tauri_nspanel::WebviewWindowExt;

// NSStatusWindowLevel: above a fullscreen game window, below system UI.
#[cfg(target_os = "macos")]
const OVERLAY_WINDOW_LEVEL: objc2_app_kit::NSWindowLevel = 25;

// macOS moves a fullscreen app into its own Space, and recent macOS versions
// only display windows of other apps there when they are NSPanels with the
// CanJoinAllSpaces + FullScreenAuxiliary collection behaviors. `alwaysOnTop`
// alone (a plain NSWindow at NSFloatingWindowLevel) is never shown above the
// fullscreen game, so the window is converted to a non-activating panel.
#[cfg(target_os = "macos")]
pub fn float_above_fullscreen<R: Runtime>(window: &WebviewWindow<R>) {
    let target = window.clone();

    let run = window.run_on_main_thread(move || {
        use objc2_app_kit::{NSPanel, NSWindowCollectionBehavior, NSWindowStyleMask};

        let ns_window_ptr = match target.ns_window() {
            Ok(ptr) => ptr,
            Err(err) => {
                warn!(
                    "[Overlay] failed to get NSWindow for {}: {err}",
                    target.label()
                );
                return;
            }
        };

        if let Err(err) = target.to_panel() {
            warn!(
                "[Overlay] failed to convert {} to NSPanel: {err}",
                target.label()
            );
            return;
        }

        // to_panel swizzles the window class to an NSPanel subclass, the
        // instance behind the pointer stays the same.
        unsafe {
            let panel = &*(ns_window_ptr as *const NSPanel);
            panel.setCollectionBehavior(
                NSWindowCollectionBehavior::CanJoinAllSpaces
                    | NSWindowCollectionBehavior::FullScreenAuxiliary,
            );
            // Keep the window's own style bits (titled, resizable, ...): the
            // non-activating one lets the panel take clicks without pulling
            // the game out of focus.
            panel.setStyleMask(panel.styleMask() | NSWindowStyleMask::NonactivatingPanel);
            panel.setLevel(OVERLAY_WINDOW_LEVEL);
            // NSPanel hides itself when the app deactivates by default, which
            // is exactly when the game is focused.
            panel.setHidesOnDeactivate(false);
            panel.setBecomesKeyOnlyIfNeeded(true);
        }

        debug!("[Overlay] {} converted to overlay panel", target.label());
    });

    if let Err(err) = run {
        warn!("[Overlay] failed to schedule on main thread: {err}");
    }
}

#[cfg(not(target_os = "macos"))]
pub fn float_above_fullscreen<R: Runtime>(_window: &WebviewWindow<R>) {}
