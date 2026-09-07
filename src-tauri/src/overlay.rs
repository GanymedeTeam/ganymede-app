#[cfg(target_os = "macos")]
use std::{ffi::c_void, sync::Mutex};

#[cfg(target_os = "macos")]
use log::{debug, warn};
#[cfg(target_os = "macos")]
use tauri::{
    plugin::{Builder, TauriPlugin},
    AppHandle, Manager, RunEvent, WindowEvent,
};
use tauri::{Runtime, WebviewWindow};
#[cfg(target_os = "macos")]
use tauri_nspanel::WebviewWindowExt;

// NSStatusWindowLevel: above a fullscreen game window, below system UI.
#[cfg(target_os = "macos")]
const OVERLAY_WINDOW_LEVEL: objc2_app_kit::NSWindowLevel = 25;

// Original Objective-C class of every converted window, keyed by label, so a
// window can be turned back into a regular NSWindow before it is torn down.
#[cfg(target_os = "macos")]
static ORIGINAL_CLASSES: Mutex<Vec<(String, usize)>> = Mutex::new(Vec::new());

#[cfg(target_os = "macos")]
#[link(name = "objc")]
extern "C" {
    fn object_getClass(obj: *const c_void) -> *const c_void;
    fn object_setClass(obj: *const c_void, cls: *const c_void) -> *const c_void;
}

// Restores the original window classes on exit. Registered before the other
// plugins so it runs before they touch the windows in their own exit handlers.
#[cfg(target_os = "macos")]
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("overlay")
        .on_event(|app, event| {
            if let RunEvent::Exit = event {
                restore_all_window_classes(app);
            }
        })
        .build()
}

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

        let original_class = unsafe { object_getClass(ns_window_ptr) };

        if let Err(err) = target.to_panel() {
            warn!(
                "[Overlay] failed to convert {} to NSPanel: {err}",
                target.label()
            );
            return;
        }

        ORIGINAL_CLASSES
            .lock()
            .unwrap()
            .push((target.label().to_string(), original_class as usize));

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

        let closing = target.clone();
        target.on_window_event(move |event| {
            if let WindowEvent::CloseRequested { .. } = event {
                restore_window_class(&closing);
            }
        });

        debug!("[Overlay] {} converted to overlay panel", target.label());
    });

    if let Err(err) = run {
        warn!("[Overlay] failed to schedule on main thread: {err}");
    }
}

#[cfg(not(target_os = "macos"))]
pub fn float_above_fullscreen<R: Runtime>(_window: &WebviewWindow<R>) {}

#[cfg(target_os = "macos")]
fn restore_all_window_classes<R: Runtime>(app: &AppHandle<R>) {
    let labels: Vec<String> = ORIGINAL_CLASSES
        .lock()
        .unwrap()
        .iter()
        .map(|(label, _)| label.clone())
        .collect();

    for label in labels {
        if let Some(window) = app.get_webview_window(&label) {
            restore_window_class(&window);
        }
    }
}

// The panel-only style bit and the swizzled class are removed before the
// window is destroyed: the exit path of tao and the other plugins expects the
// original NSWindow subclass, and tears the app down otherwise.
#[cfg(target_os = "macos")]
fn restore_window_class<R: Runtime>(window: &WebviewWindow<R>) {
    use objc2_app_kit::{NSPanel, NSWindowStyleMask};

    let original_class = {
        let mut classes = ORIGINAL_CLASSES.lock().unwrap();
        let Some(index) = classes
            .iter()
            .position(|(label, _)| label == window.label())
        else {
            return;
        };
        classes.swap_remove(index).1
    };

    let Ok(ns_window_ptr) = window.ns_window() else {
        return;
    };

    unsafe {
        let panel = &*(ns_window_ptr as *const NSPanel);
        panel.setStyleMask(panel.styleMask() & !NSWindowStyleMask::NonactivatingPanel);
        object_setClass(ns_window_ptr, original_class as *const c_void);
    }

    debug!("[Overlay] {} restored to a regular window", window.label());
}
