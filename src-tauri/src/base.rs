use log::{debug, error, info};
use tauri::{AppHandle, Runtime};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_opener::OpenerExt;

#[taurpc::procedures(path = "base", export_to = "../src/ipc/bindings.ts")]
pub trait BaseApi {
    #[taurpc(alias = "newId")]
    async fn new_id() -> String;
    #[taurpc(alias = "openUrl")]
    async fn open_url<R: Runtime>(app_handle: AppHandle<R>, url: String) -> Result<(), String>;
    #[taurpc(alias = "isProduction")]
    async fn is_production() -> bool;
    async fn startup<R: tauri::Runtime>(app_handle: AppHandle<R>);
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

    async fn startup<R: tauri::Runtime>(self, app_handle: AppHandle<R>) {
        debug!("[Base] Startup");

        if let Ok(Some(urls)) = app_handle.deep_link().get_current() {
            info!("[Base] Deep link URLs received on startup: {:?}", urls);

            if let Some(url) = urls.first() {
                if let Err(err) =
                    crate::deep_link::handle_deep_link_url(app_handle.clone(), url.as_str())
                {
                    error!(
                        "[Base] Failed to handle deep link URL on startup: {:?}",
                        err
                    );
                }
            }
        }
    }
}
