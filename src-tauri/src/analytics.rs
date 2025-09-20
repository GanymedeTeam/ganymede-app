use log::{debug, error, info};
use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_http::reqwest;

use crate::api::{API_KEY, API_KEY_HEADER, GANYMEDE_API};

#[allow(dead_code)]
#[derive(Debug, Serialize, thiserror::Error)]
pub enum AnalyticsError {
    #[error("failed to get os")]
    OsNotFound,
    #[error("failed to request downloaded: {0}")]
    RequestDownloaded(String),
    #[error("failed to increment downloaded count: {0} - {1}")]
    DownloadedCount(String, String),
}

#[derive(Serialize)]
struct DownloadedBody {
    #[serde(rename = "uniqueID")]
    unique_id: String,
    version: String,
    os: String,
}

fn os_to_string(os: String) -> Option<String> {
    match os.as_str() {
        "windows" => Some("Windows".into()),
        "macos" => Some("Mac_OS".into()),
        "linux" => Some("linux".into()),
        _ => None,
    }
}

pub async fn increment_app_download_count(
    version: String,
    http_client: &tauri_plugin_http::reqwest::Client,
) -> Result<tauri_plugin_http::reqwest::Response, AnalyticsError> {
    let id = machine_uid::get().unwrap();
    let os = std::env::consts::OS.to_string();
    let os = os_to_string(os).ok_or(AnalyticsError::OsNotFound)?;

    info!(
        "[Api] id = \"{}\", version = {}, os = {:?}",
        id, version, os
    );

    debug!("[Api] Incrementing app download count");

    let body = DownloadedBody {
        unique_id: id,
        version,
        os,
    };

    let res = http_client
        .post(format!("{}/downloaded", GANYMEDE_API))
        .header(API_KEY_HEADER, API_KEY)
        .json(&body)
        .send()
        .await
        .map_err(|err| AnalyticsError::RequestDownloaded(err.to_string()))?;

    if res.status().is_success() {
        Ok(res)
    } else {
        Err(AnalyticsError::DownloadedCount(
            res.status().to_string(),
            res.text().await.expect("[Api] failed to get response text"),
        ))
    }
}

pub fn increment_download_count(app_handle: &AppHandle, http_client: reqwest::Client) {
    let version = app_handle.package_info().version.to_string();

    tauri::async_runtime::spawn(async move {
        let res = increment_app_download_count(version, &http_client).await;

        match &res {
            Err(err) => {
                error!("[Analytics] {:?}", err);
                #[cfg(not(debug_assertions))]
                tauri_plugin_sentry::sentry::capture_error(&err);
            }
            _ => {
                info!("[Analytics] app download count incremented");
            }
        }
    });
}
