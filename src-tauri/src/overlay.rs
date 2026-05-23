use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};

#[cfg(windows)]
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, RwLock,
};
#[cfg(windows)]
use std::{thread, time::Duration};
#[cfg(windows)]
use tauri::Manager;
#[cfg(windows)]
use windows_sys::Win32::{
    Foundation::{HWND, POINT, RECT},
    Graphics::Gdi::ScreenToClient,
    UI::WindowsAndMessaging::{GetClientRect, GetCursorPos},
};

#[cfg(windows)]
const ACTIVE_POLL_INTERVAL: Duration = Duration::from_millis(16);
#[cfg(windows)]
const IDLE_POLL_INTERVAL: Duration = Duration::from_millis(250);

/// Rectangle expressed in physical pixels, matching the coordinates used by the native window.
#[derive(Debug, Clone, Serialize, Deserialize, taurpc::specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct InteractiveRegion {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[cfg(windows)]
#[derive(Debug, Clone)]
struct OverlaySnapshot {
    enabled: bool,
    current_click_through: bool,
    interactive_regions: Arc<[InteractiveRegion]>,
    window_hwnd: Option<isize>,
}

#[cfg(windows)]
impl Default for OverlaySnapshot {
    fn default() -> Self {
        Self {
            enabled: false,
            current_click_through: false,
            interactive_regions: Arc::from(Vec::<InteractiveRegion>::new()),
            window_hwnd: None,
        }
    }
}

#[cfg(windows)]
#[derive(Debug)]
struct OverlayState {
    snapshot: RwLock<OverlaySnapshot>,
    shutdown: AtomicBool,
    tracking_started: AtomicBool,
}

#[cfg(windows)]
impl Default for OverlayState {
    fn default() -> Self {
        Self {
            snapshot: RwLock::new(OverlaySnapshot::default()),
            shutdown: AtomicBool::new(false),
            tracking_started: AtomicBool::new(false),
        }
    }
}

#[cfg(windows)]
impl OverlayState {
    fn snapshot(&self) -> OverlaySnapshot {
        match self.snapshot.read() {
            Ok(snapshot) => snapshot.clone(),
            Err(poisoned) => {
                let snapshot = poisoned.into_inner();
                snapshot.clone()
            }
        }
    }

    fn update(&self, update_snapshot: impl FnOnce(&mut OverlaySnapshot)) {
        match self.snapshot.write() {
            Ok(mut snapshot) => update_snapshot(&mut snapshot),
            Err(poisoned) => {
                let mut snapshot = poisoned.into_inner();
                update_snapshot(&mut snapshot);
            }
        }
    }

    fn set_current_click_through(&self, current_click_through: bool) {
        self.update(|snapshot| {
            snapshot.current_click_through = current_click_through;
        });
    }
}

#[derive(Debug, Default)]
pub struct OverlayManager {
    #[cfg(windows)]
    state: Arc<OverlayState>,
}

impl OverlayManager {
    pub fn set_enabled(&self, enabled: bool) {
        #[cfg(windows)]
        {
            self.state.update(|snapshot| {
                snapshot.enabled = enabled;
            });
        }

        #[cfg(not(windows))]
        {
            let _ = enabled;
            // Overlay click-through is Windows-only; keep the config path callable elsewhere.
        }
    }

    pub fn set_interactive_regions(&self, interactive_regions: Vec<InteractiveRegion>) {
        #[cfg(windows)]
        {
            self.state.update(|snapshot| {
                snapshot.interactive_regions = Arc::from(interactive_regions);
            });
        }

        #[cfg(not(windows))]
        {
            let _ = interactive_regions;
            // TauRPC bindings stay portable while non-Windows overlay behavior remains a no-op.
        }
    }

    pub fn install_on_main_window<R: Runtime>(&self, app: &AppHandle<R>) -> Result<(), String> {
        #[cfg(windows)]
        {
            let window = app
                .get_webview_window("main")
                .ok_or_else(|| "[Overlay] main window not found".to_string())?;
            let hwnd = window
                .hwnd()
                .map_err(|err| format!("[Overlay] failed to get window handle: {err}"))?;
            self.state.update(|snapshot| {
                snapshot.window_hwnd = Some(hwnd.0 as isize);
            });
        }

        #[cfg(not(windows))]
        {
            let _ = app;
            // Overlay click-through is implemented with HWND APIs, so other platforms intentionally no-op.
        }

        Ok(())
    }

    pub fn start_cursor_tracking<R: Runtime + 'static>(&self, app: &AppHandle<R>) {
        #[cfg(windows)]
        {
            if self.state.tracking_started.swap(true, Ordering::SeqCst) {
                return;
            }

            self.state.shutdown.store(false, Ordering::SeqCst);
            let state = self.state.clone();
            let app_handle = app.clone();

            thread::spawn(move || {
                while !state.shutdown.load(Ordering::SeqCst) {
                    let poll_interval = update_click_through_state(&app_handle, &state);
                    thread::sleep(poll_interval);
                }

                let snapshot = state.snapshot();
                reset_click_through_if_needed(&app_handle, &state, &snapshot);
                state.tracking_started.store(false, Ordering::SeqCst);
            });
        }

        #[cfg(not(windows))]
        {
            let _ = app;
            // Keep the TauRPC surface portable; cursor tracking is intentionally a no-op off Windows.
        }
    }

    pub fn stop_cursor_tracking(&self) {
        #[cfg(windows)]
        {
            self.state.shutdown.store(true, Ordering::SeqCst);
        }
    }
}

#[cfg(windows)]
fn update_click_through_state<R: Runtime>(app: &AppHandle<R>, state: &OverlayState) -> Duration {
    let snapshot = state.snapshot();
    let Some(hwnd_raw) = snapshot.window_hwnd else {
        return reset_click_through_if_needed(app, state, &snapshot);
    };

    if !snapshot.enabled || snapshot.interactive_regions.is_empty() {
        return reset_click_through_if_needed(app, state, &snapshot);
    }

    let should_click_through =
        is_cursor_in_passthrough_area(hwnd_raw, snapshot.interactive_regions.as_ref());

    if snapshot.current_click_through == should_click_through {
        return ACTIVE_POLL_INTERVAL;
    }

    if set_click_through(app, should_click_through) {
        state.set_current_click_through(should_click_through);
    }

    ACTIVE_POLL_INTERVAL
}

#[cfg(windows)]
fn reset_click_through_if_needed<R: Runtime>(
    app: &AppHandle<R>,
    state: &OverlayState,
    snapshot: &OverlaySnapshot,
) -> Duration {
    if snapshot.current_click_through && set_click_through(app, false) {
        state.set_current_click_through(false);
    }

    IDLE_POLL_INTERVAL
}

#[cfg(windows)]
fn set_click_through<R: Runtime>(app: &AppHandle<R>, click_through: bool) -> bool {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_ignore_cursor_events(click_through);
        return true;
    }

    false
}

#[cfg(windows)]
fn is_cursor_in_passthrough_area(
    hwnd_raw: isize,
    interactive_regions: &[InteractiveRegion],
) -> bool {
    let hwnd = hwnd_raw as HWND;
    let mut screen_point = POINT { x: 0, y: 0 };

    if unsafe { GetCursorPos(&mut screen_point) } == 0 {
        return false;
    }

    let mut client_point = screen_point;

    if unsafe { ScreenToClient(hwnd, &mut client_point) } == 0 {
        return false;
    }

    let mut client_rect = RECT {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };

    if unsafe { GetClientRect(hwnd, &mut client_rect) } == 0 {
        return false;
    }

    let is_inside_window = client_point.x >= client_rect.left
        && client_point.x <= client_rect.right
        && client_point.y >= client_rect.top
        && client_point.y <= client_rect.bottom;

    is_inside_window
        && !interactive_regions.iter().any(|region| {
            client_point.x >= region.x
                && client_point.x <= region.x + region.width
                && client_point.y >= region.y
                && client_point.y <= region.y + region.height
        })
}
#[taurpc::procedures(path = "overlay", export_to = "../src/ipc/bindings.ts")]
pub trait OverlayApi {
    #[taurpc(alias = "setInteractiveRegions")]
    async fn set_interactive_regions<R: Runtime>(
        app_handle: AppHandle<R>,
        interactive_regions: Vec<InteractiveRegion>,
    ) -> Result<(), String>;
}

#[derive(Clone)]
pub struct OverlayApiImpl;

#[taurpc::resolvers]
impl OverlayApi for OverlayApiImpl {
    async fn set_interactive_regions<R: Runtime>(
        self,
        app_handle: AppHandle<R>,
        interactive_regions: Vec<InteractiveRegion>,
    ) -> Result<(), String> {
        #[cfg(windows)]
        {
            let overlay_manager = app_handle.state::<OverlayManager>();
            overlay_manager.set_interactive_regions(interactive_regions);
        }

        #[cfg(not(windows))]
        {
            let _ = app_handle;
            let _ = interactive_regions;
            // The TauRPC command is intentionally present, but overlay passthrough is Windows-only.
        }

        Ok(())
    }
}
