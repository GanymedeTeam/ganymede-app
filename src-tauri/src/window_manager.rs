use std::collections::HashMap;
use std::sync::Mutex;

use log::{debug, info, warn};
use tauri::{
    AppHandle, LogicalPosition, LogicalSize, Manager, Runtime, WebviewUrl, WebviewWindowBuilder,
};

// Injected before page parsing, runs in the page's own context (unlike an iframe),
// so we can hide the floating reCAPTCHA badge that overlaps the tool.
const RESTYLE_HUNT_PAGE: &str = r#"(function () {
  if (!location.hostname.endsWith('dofusdb.fr')) return;
  function inject() {
    var style = document.createElement('style');
    style.textContent = '.grecaptcha-badge{visibility:hidden!important;} .q-header,.q-field__bottom,.q-field__append, .full-width.q-mb-sm, .pip-button { display: none; } .q-field { margin-inline: 2px !important; } .q-field, :where(.q-page) button:has(.q-focus-helper), .q-field__control, .treasure-hunt-direction-icon.q-icon { font-size: 1rem !important; } .q-field__control { padding: 0 2px !important; min-width: 1rem; } .q-mt-xs > span { font-size: 1.5rem; } .treasure-hunt-direction { height: 25px !important; width: 25px !important; padding: 0; display: flex; justify-content: center; align-items: center; }';
    document.head.appendChild(style);
  }
  if (document.head) {
    inject();
  } else {
    document.addEventListener('DOMContentLoaded', inject);
  }
})();"#;

// Injected before page parsing to hide the floating reCAPTCHA badge and the
// site header so the map fills the tool window.
const RESTYLE_MAP_PAGE: &str = r#"(function () {
  if (!location.hostname.endsWith('dofusdb.fr')) return;
  function inject() {
    var style = document.createElement('style');
    style.textContent = '.grecaptcha-badge{visibility:hidden!important;} .q-header{display:none;}';
    document.head.appendChild(style);
  }
  if (document.head) {
    inject();
  } else {
    document.addEventListener('DOMContentLoaded', inject);
  }
})();"#;

pub struct WindowMetadata {
    pub label: String,
}

pub struct WindowManager {
    windows: Mutex<HashMap<String, WindowMetadata>>,
}

impl WindowManager {
    pub fn new() -> Self {
        Self {
            windows: Mutex::new(HashMap::new()),
        }
    }

    pub fn get_main_window_geometry<R: Runtime>(
        &self,
        app: &AppHandle<R>,
    ) -> Result<(LogicalPosition<f64>, LogicalSize<f64>), String> {
        let main_window = app
            .get_webview_window("main")
            .ok_or_else(|| "Main window not found".to_string())?;

        let factor = main_window
            .scale_factor()
            .map_err(|e| format!("Failed to get scale factor: {}", e))?;

        let position = main_window
            .outer_position()
            .map_err(|e| format!("Failed to get main window position: {}", e))?;
        let position = position.to_logical::<f64>(factor);

        let size = main_window
            .inner_size()
            .map_err(|e| format!("Failed to get main window size: {}", e))?;
        let size = size.to_logical::<f64>(factor);

        Ok((position, size))
    }

    pub fn create_image_viewer_window<R: Runtime>(
        &self,
        app: &AppHandle<R>,
        label: String,
        image_url: String,
        title: Option<String>,
        position: LogicalPosition<f64>,
        size: LogicalSize<f64>,
    ) -> Result<(), String> {
        let encoded_url = urlencoding::encode(&image_url);
        let encoded_title = title.as_ref().map(|t| urlencoding::encode(t));

        let mut url = format!("/image-viewer?image={}", encoded_url);
        if let Some(t) = encoded_title {
            url.push_str(&format!("&title={}", t));
        }

        debug!("Creating image viewer window with label: {}", label);
        debug!("URL: {}", url);

        let window = WebviewWindowBuilder::new(app, &label, WebviewUrl::App(url.into()))
            .title(title.unwrap_or_else(|| "Image Viewer".to_string()))
            .inner_size(size.width, size.height)
            .position(position.x + 15f64, position.y + 15f64)
            .resizable(true)
            .always_on_top(true)
            .decorations(false)
            .transparent(true)
            .accept_first_mouse(true)
            .build()
            .map_err(|e| format!("Failed to create image viewer window: {}", e))?;

        let window_label = window.label().to_string();
        let app_handle = app.clone();

        window.on_window_event(move |event| {
            if let tauri::WindowEvent::Destroyed = event {
                info!(
                    "[WindowManager] Image viewer window destroyed: {}",
                    window_label
                );
                if let Some(window_manager) = app_handle.try_state::<WindowManager>() {
                    window_manager.cleanup_closed_window(&window_label);
                }
            }
        });

        info!("Image viewer window created: {}", label);
        Ok(())
    }

    pub fn open_dofusdb_hunt_window<R: Runtime>(
        &self,
        app: &AppHandle<R>,
        lang: String,
    ) -> Result<(), String> {
        self.open_dofusdb_window(
            app,
            "dofusdb-hunt",
            "tools/treasure-hunt",
            "Chasse au trésor — DofusDB",
            &lang,
            RESTYLE_HUNT_PAGE,
        )
    }

    pub fn open_dofusdb_map_window<R: Runtime>(
        &self,
        app: &AppHandle<R>,
        lang: String,
    ) -> Result<(), String> {
        self.open_dofusdb_window(
            app,
            "dofusdb-map",
            "tools/map",
            "Carte — DofusDB",
            &lang,
            RESTYLE_MAP_PAGE,
        )
    }

    fn open_dofusdb_window<R: Runtime>(
        &self,
        app: &AppHandle<R>,
        label: &str,
        path: &str,
        title: &str,
        lang: &str,
        init_script: &str,
    ) -> Result<(), String> {
        if let Some(window) = app.get_webview_window(label) {
            window
                .set_focus()
                .map_err(|e| format!("Failed to focus dofusdb window: {}", e))?;
            return Ok(());
        }

        let url = format!("https://dofusdb.fr/{}/{}", lang.to_lowercase(), path);
        let url = url
            .parse()
            .map_err(|e| format!("Invalid dofusdb url: {}", e))?;

        let (position, size) = self.get_main_window_geometry(app)?;

        WebviewWindowBuilder::new(app, label, WebviewUrl::External(url))
            .title(title)
            .inner_size(size.width, size.height)
            .min_inner_size(250.0, 300.0)
            .position(position.x + 15f64, position.y + 15f64)
            .resizable(true)
            .always_on_top(true)
            .initialization_script(init_script)
            .build()
            .map_err(|e| format!("Failed to create dofusdb window: {}", e))?;

        info!("[WindowManager] DofusDB window created: {}", label);
        Ok(())
    }

    pub fn get_or_create_window<R: Runtime>(
        &self,
        app: &AppHandle<R>,
        image_url: String,
        title: Option<String>,
    ) -> Result<String, String> {
        let url_hash = format!("{:x}", md5::compute(&image_url));
        let label = format!("image-viewer-{}", url_hash);

        {
            let windows = self.windows.lock().unwrap();
            if windows.contains_key(&url_hash) {
                if let Some(window) = app.get_webview_window(&label) {
                    debug!("Window already exists for image, focusing: {}", label);
                    window
                        .set_focus()
                        .map_err(|e| format!("Failed to focus window: {}", e))?;
                    return Ok(label);
                } else {
                    warn!("Window metadata exists but window not found, recreating");
                }
            }
        }

        let (position, size) = self.get_main_window_geometry(app)?;

        self.create_image_viewer_window(
            app,
            label.clone(),
            image_url.clone(),
            title,
            position,
            size,
        )?;

        {
            let mut windows = self.windows.lock().unwrap();
            windows.insert(
                url_hash,
                WindowMetadata {
                    label: label.clone(),
                },
            );
        }

        Ok(label)
    }

    pub fn cleanup_closed_window(&self, label: &str) {
        let mut windows = self.windows.lock().unwrap();
        windows.retain(|_, metadata| metadata.label != label);
        debug!("Cleaned up window metadata for: {}", label);
    }
}

impl Default for WindowManager {
    fn default() -> Self {
        Self::new()
    }
}
