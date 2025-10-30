use log::{debug, info};
use tauri::{AppHandle, Manager, Runtime};

use crate::window_manager::WindowManager;

#[taurpc::procedures(path = "image_viewer", export_to = "../src/ipc/bindings.ts")]
pub trait ImageViewerApi {
    #[taurpc(alias = "openImageViewer")]
    async fn open_image_viewer<R: Runtime>(
        app_handle: AppHandle<R>,
        image_url: String,
        title: Option<String>,
    ) -> Result<String, String>;

    #[taurpc(alias = "closeImageViewer")]
    async fn close_image_viewer<R: Runtime>(
        app_handle: AppHandle<R>,
        window_label: String,
    ) -> Result<(), String>;
}

#[derive(Clone)]
pub struct ImageViewerApiImpl;

#[taurpc::resolvers]
impl ImageViewerApi for ImageViewerApiImpl {
    async fn open_image_viewer<R: Runtime>(
        self,
        app_handle: AppHandle<R>,
        image_url: String,
        title: Option<String>,
    ) -> Result<String, String> {
        debug!(
            "[ImageViewer] open_image_viewer called with URL: {}",
            image_url
        );

        let window_manager = app_handle
            .state::<WindowManager>()
            .inner();

        let label = window_manager.get_or_create_window(&app_handle, image_url.clone(), title)?;

        info!("[ImageViewer] Window opened/focused: {}", label);
        Ok(label)
    }

    async fn close_image_viewer<R: Runtime>(
        self,
        app_handle: AppHandle<R>,
        window_label: String,
    ) -> Result<(), String> {
        debug!(
            "[ImageViewer] close_image_viewer called for: {}",
            window_label
        );

        if let Some(window) = app_handle.get_webview_window(&window_label) {
            window
                .close()
                .map_err(|e| format!("Failed to close window: {}", e))?;
            info!("[ImageViewer] Window closed: {}", window_label);
            Ok(())
        } else {
            Err(format!("Window not found: {}", window_label))
        }
    }
}
