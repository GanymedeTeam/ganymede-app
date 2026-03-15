use std::{
    sync::{Arc, Mutex},
    time::Duration,
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};

#[cfg(windows)]
use std::thread;
#[cfg(windows)]
use windows_sys::Win32::{
    Foundation::{HWND, POINT, RECT},
    Graphics::Gdi::ScreenToClient,
    UI::WindowsAndMessaging::{GetClientRect, GetCursorPos},
};

#[derive(Debug, Clone, Serialize, Deserialize, taurpc::specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct InteractiveRegion {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Default)]
struct OverlayState {
    enabled: Mutex<bool>,
    current_click_through: Mutex<bool>,
    interactive_regions: Mutex<Vec<InteractiveRegion>>,
    window_hwnd: Mutex<Option<isize>>,
}

#[derive(Debug, Default)]
pub struct OverlayManager {
    state: Arc<OverlayState>,
}

impl OverlayManager {
    pub fn set_enabled(&self, enabled: bool) {
        *self.state.enabled.lock().unwrap() = enabled;
    }

    pub fn set_interactive_regions(&self, interactive_regions: Vec<InteractiveRegion>) {
        *self.state.interactive_regions.lock().unwrap() = interactive_regions;
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
            *self.state.window_hwnd.lock().unwrap() = Some(hwnd.0 as isize);
        }

        #[cfg(not(windows))]
        {
            let _ = app;
        }

        Ok(())
    }

    pub fn start_cursor_tracking<R: Runtime + 'static>(&self, app: &AppHandle<R>) {
        #[cfg(windows)]
        {
            let state = self.state.clone();
            let app_handle = app.clone();

            thread::spawn(move || loop {
                update_click_through_state(&app_handle, &state);
                thread::sleep(Duration::from_millis(16));
            });
        }

        #[cfg(not(windows))]
        {
            let _ = app;
        }
    }
}

#[cfg(windows)]
fn update_click_through_state<R: Runtime>(app: &AppHandle<R>, state: &OverlayState) {
    let hwnd_raw = {
        let hwnd = state.window_hwnd.lock().unwrap();
        match *hwnd {
            Some(hwnd) => hwnd,
            None => return,
        }
    };
    let interactive_regions = state.interactive_regions.lock().unwrap().clone();
    let overlay_enabled = *state.enabled.lock().unwrap();
    let should_click_through =
        overlay_enabled && !interactive_regions.is_empty() && is_cursor_in_passthrough_area(hwnd_raw, &interactive_regions);
    let mut current_click_through = state.current_click_through.lock().unwrap();

    if *current_click_through == should_click_through {
        return;
    }

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_ignore_cursor_events(should_click_through);
    }
    *current_click_through = should_click_through;
}

#[cfg(windows)]
fn is_cursor_in_passthrough_area(hwnd_raw: isize, interactive_regions: &[InteractiveRegion]) -> bool {
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
        let overlay_manager = app_handle.state::<OverlayManager>();
        overlay_manager.set_interactive_regions(interactive_regions);

        Ok(())
    }
}
