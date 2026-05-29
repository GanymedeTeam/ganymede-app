use tauri::{AppHandle, Manager, Runtime};

use crate::window_manager::WindowManager;

#[taurpc::procedures(path = "dofusdb", export_to = "../src/ipc/bindings.ts")]
pub trait DofusDbApi {
    #[taurpc(alias = "openHunt")]
    async fn open_hunt<R: Runtime>(app_handle: AppHandle<R>, lang: String) -> Result<(), String>;
}

#[derive(Clone)]
pub struct DofusDbApiImpl;

#[taurpc::resolvers]
impl DofusDbApi for DofusDbApiImpl {
    async fn open_hunt<R: Runtime>(
        self,
        app_handle: AppHandle<R>,
        lang: String,
    ) -> Result<(), String> {
        app_handle
            .state::<WindowManager>()
            .inner()
            .open_dofusdb_hunt_window(&app_handle, lang)
    }
}
