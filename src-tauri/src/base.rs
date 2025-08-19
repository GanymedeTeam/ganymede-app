use tauri::{AppHandle, Runtime};
use tauri_plugin_opener::OpenerExt;

#[taurpc::procedures(path = "base", export_to = "../src/ipc/bindings.ts")]
pub trait BaseApi {
    #[taurpc(alias = "newId")]
    async fn new_id() -> String;
    #[taurpc(alias = "openUrl")]
    async fn open_url<R: Runtime>(app_handle: AppHandle<R>, url: String) -> Result<(), String>;
    #[taurpc(alias = "isProduction")]
    async fn is_production() -> bool;
}

#[derive(Clone)]
pub struct BaseApiImpl;

#[taurpc::resolvers]
impl BaseApi for BaseApiImpl {
    async fn new_id(self) -> String {
        uuid::Uuid::new_v4().to_string()
    }

    async fn open_url<R: Runtime>(self, app: AppHandle<R>, url: String) -> Result<(), String> {
        app.opener()
            .open_url(url, None::<String>)
            .map_err(|err| err.to_string())
    }

    async fn is_production(self) -> bool {
        #[cfg(dev)]
        return false;

        #[cfg(not(dev))]
        return true;
    }
}
