use crate::event::Event;
use log::{debug, info};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_updater::UpdaterExt;

#[derive(Serialize, Debug, thiserror::Error, taurpc::specta::Type)]
#[specta(rename = "UpdateError")]
pub enum Error {
    #[error("Update error: {0}")]
    CheckUpdateError(String),
    #[error("Failed to get updater: {0}")]
    GetUpdaterError(String),
}

#[taurpc::procedures(path = "update", export_to = "../src/ipc/bindings.ts")]
pub trait UpdateApi {
    #[taurpc(alias = "startUpdate")]
    async fn start_update<R: Runtime>(app_handle: AppHandle<R>) -> Result<(), Error>;
}

#[derive(Clone)]
pub struct UpdateApiImpl;

#[taurpc::resolvers]
impl UpdateApi for UpdateApiImpl {
    async fn start_update<R: Runtime>(self, app_handle: AppHandle<R>) -> Result<(), Error> {
        #[cfg(not(debug_assertions))]
        use tauri_plugin_sentry::sentry::{add_breadcrumb, Breadcrumb};

        debug!("[Update] starting update check");

        #[cfg(not(debug_assertions))]
        add_breadcrumb(Breadcrumb {
            ty: "info".into(),
            category: Some("update".into()),
            message: Some("starting update check".to_string()),
            ..Default::default()
        });

        if let Some(update) = app_handle
            .updater()
            .map_err(|err| Error::GetUpdaterError(err.to_string()))?
            .check()
            .await
            .map_err(|err| Error::CheckUpdateError(err.to_string()))?
        {
            debug!("[Update] update found");

            #[cfg(not(debug_assertions))]
            add_breadcrumb(Breadcrumb {
                ty: "info".into(),
                category: Some("update".into()),
                message: Some("update found".to_string()),
                ..Default::default()
            });

            app_handle.emit(Event::UpdateStarted.into(), 0).unwrap();

            let mut downloaded = 0;

            // alternatively we could also call update.download() and update.install() separately
            let bytes = update
                .download(
                    |chunk_length, content_length| {
                        downloaded += chunk_length;
                        app_handle
                            .emit(Event::UpdateInProgress.into(), (downloaded, content_length))
                            .unwrap();
                        info!("[Update] downloaded {downloaded} from {content_length:?}");
                    },
                    || {
                        #[cfg(not(debug_assertions))]
                        add_breadcrumb(Breadcrumb {
                            ty: "info".into(),
                            category: Some("update".into()),
                            message: Some("update downloaded".to_string()),
                            ..Default::default()
                        });
                        app_handle.emit(Event::UpdateFinished.into(), 0).unwrap();
                        info!("[Update] download finished");
                    },
                )
                .await
                .unwrap();

            debug!("[Update] downloaded");

            #[cfg(not(debug_assertions))]
            add_breadcrumb(Breadcrumb {
                ty: "info".into(),
                category: Some("update".into()),
                message: Some("installing update".to_string()),
                ..Default::default()
            });

            update.install(bytes).unwrap();

            info!("[Update] update installed");

            #[cfg(not(debug_assertions))]
            add_breadcrumb(Breadcrumb {
                ty: "info".into(),
                category: Some("update".into()),
                message: Some("restarting the application".to_string()),
                ..Default::default()
            });

            // not required, but we can restart the app after the update
            app_handle.restart();
        }

        Ok(())
    }
}
