use std::collections::HashMap;
use std::sync::Mutex;

use log::{debug, info, warn};
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, Runtime, WebviewUrl, WebviewWindowBuilder};

pub struct WindowMetadata {
    pub label: String,
    pub image_url: String,
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
    ) -> Result<(PhysicalPosition<i32>, PhysicalSize<u32>), String> {
        let main_window = app
            .get_webview_window("main")
            .ok_or_else(|| "Main window not found".to_string())?;

        let position = main_window
            .outer_position()
            .map_err(|e| format!("Failed to get main window position: {}", e))?;

        let size = main_window
            .outer_size()
            .map_err(|e| format!("Failed to get main window size: {}", e))?;

        Ok((position, size))
    }

    pub fn create_image_viewer_window<R: Runtime>(
        &self,
        app: &AppHandle<R>,
        label: String,
        image_url: String,
        title: Option<String>,
        position: PhysicalPosition<i32>,
        size: PhysicalSize<u32>,
    ) -> Result<(), String> {
        let encoded_url = urlencoding::encode(&image_url);
        let encoded_title = title.as_ref().map(|t| urlencoding::encode(t));

        let mut url = format!("/?image={}", encoded_url);
        if let Some(t) = encoded_title {
            url.push_str(&format!("&title={}", t));
        }

        debug!("Creating image viewer window with label: {}", label);
        debug!("URL: {}", url);

        let window = WebviewWindowBuilder::new(app, &label, WebviewUrl::App(url.into()))
            .title(title.unwrap_or_else(|| "Image Viewer".to_string()))
            .inner_size(size.width as f64, size.height as f64)
            .position(position.x as f64, position.y as f64)
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
                info!("[WindowManager] Image viewer window destroyed: {}", window_label);
                if let Some(window_manager) = app_handle.try_state::<WindowManager>() {
                    window_manager.cleanup_closed_window(&window_label);
                }
            }
        });

        info!("Image viewer window created: {}", label);
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
                    image_url,
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

    pub fn window_exists(&self, image_url: &str) -> bool {
        let url_hash = format!("{:x}", md5::compute(image_url));
        let windows = self.windows.lock().unwrap();
        windows.contains_key(&url_hash)
    }
}

impl Default for WindowManager {
    fn default() -> Self {
        Self::new()
    }
}
