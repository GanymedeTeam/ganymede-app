use log::{debug, error, info};
use serde::Serialize;
use tauri::{AppHandle, Runtime};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_opener::OpenerExt;

// Only a release macOS build constructs the location variants; on other targets
// (and in dev) the resolver only ever returns `NotConcerned`.
#[cfg_attr(not(all(target_os = "macos", not(dev))), allow(dead_code))]
#[derive(Debug, Clone, Serialize, taurpc::specta::Type)]
pub enum InstallLocation {
    Applications,
    NotInApplications,
    Translocated,
    NotConcerned,
}

#[cfg(all(target_os = "macos", not(dev)))]
fn install_location<R: Runtime>(app_handle: &AppHandle<R>) -> InstallLocation {
    use tauri::Manager;

    let exe = match std::env::current_exe() {
        Ok(exe) => exe,
        // Fail open: don't warn if we can't resolve the path.
        Err(_) => return InstallLocation::NotConcerned,
    };
    let path = exe.to_string_lossy();

    // Unsigned + quarantined app run from Downloads: macOS executes it from a
    // read-only randomized path, which prevents in-place updates.
    if path.contains("/AppTranslocation/") {
        return InstallLocation::Translocated;
    }

    let in_system_applications = path.starts_with("/Applications/");
    let in_user_applications = app_handle
        .path()
        .home_dir()
        .map(|home| path.starts_with(&format!("{}/Applications/", home.to_string_lossy())))
        .unwrap_or(false);

    if in_system_applications || in_user_applications {
        InstallLocation::Applications
    } else {
        InstallLocation::NotInApplications
    }
}

// Only a release macOS build can be affected by App Translocation / in-place
// update issues; everything else (Windows, Linux, dev) is not concerned.
#[cfg(not(all(target_os = "macos", not(dev))))]
fn install_location<R: Runtime>(_app_handle: &AppHandle<R>) -> InstallLocation {
    InstallLocation::NotConcerned
}

#[taurpc::procedures(path = "base", export_to = "../src/ipc/bindings.ts")]
pub trait BaseApi {
    #[taurpc(alias = "newId")]
    async fn new_id() -> String;
    #[taurpc(alias = "openUrl")]
    async fn open_url<R: Runtime>(app_handle: AppHandle<R>, url: String) -> Result<(), String>;
    #[taurpc(alias = "isProduction")]
    async fn is_production() -> bool;
    #[taurpc(alias = "getInstallLocation")]
    async fn get_install_location<R: Runtime>(app_handle: AppHandle<R>) -> InstallLocation;
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

    async fn get_install_location<R: Runtime>(self, app_handle: AppHandle<R>) -> InstallLocation {
        install_location(&app_handle)
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
