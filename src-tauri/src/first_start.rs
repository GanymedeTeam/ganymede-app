use crate::guides::download_default_guide;
use crate::tauri_api_ext::FirstTimePathExt;
use log::{error, info};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_sentry::sentry;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Failed to write first time start file: {0}")]
    Write(std::io::Error),
}

pub trait FirstStartExt {
    fn is_first_start(&self) -> Result<bool, Error>;
}

impl<R: Runtime> FirstStartExt for AppHandle<R> {
    fn is_first_start(&self) -> Result<bool, Error> {
        let resolver = self.path();

        let first_time_start = resolver.app_first_time_start();
        let exists = first_time_start.exists();
        let version = self.package_info().version.to_string();

        if !exists {
            std::fs::write(
                first_time_start,
                format!(r###"{{"version": "{version}"}}"###, version = version),
            )
            .map_err(Error::Write)?;
        }

        Ok(!exists)
    }
}

pub fn handle_first_start_setup(app_handle: AppHandle) {
    let handle = app_handle.clone();

    match handle.is_first_start() {
        Err(err) => {
            error!("[Lib] failed to ensure first start: {:?}", err);
            sentry::capture_error(&err);
        }
        Ok(first_start) => {
            if first_start {
                info!("[Lib] first start");

                tauri::async_runtime::spawn(async move {
                    let res = download_default_guide(&handle).await;

                    match res {
                        Err(err) => {
                            error!("[Lib] cannot download default guide {:?}", err);
                            sentry::capture_error(&err);
                        }
                        Ok(_) => {
                            info!("[Lib] default guide downloaded");
                        }
                    }
                });
            }
        }
    }
}
