use log::debug;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};
use tauri_plugin_http::reqwest;

#[cfg(not(dev))]
use log::info;
#[cfg(not(dev))]
use serde::Serialize;

pub const DOFUSDB_API: &str = "https://api.dofusdb.fr";
#[cfg(not(dev))]
pub const GANYMEDE_API: &str = "https://ganymede-dofus.com/api";
pub const GANYMEDE_API_V2: &str = "https://ganymede-dofus.com/api/v2";

const GITHUB_API: &str = "https://api.github.com/repos/GanymedeTeam/ganymede-app";

#[allow(dead_code)]
#[derive(Debug)]
pub enum Error {
    OsNotFound,
    BuildClientBuilder(reqwest::Error),
    RequestDownloaded(reqwest::Error),
    DownloadedCount(reqwest::StatusCode, String),
}

#[cfg(not(dev))]
#[derive(Serialize)]
struct DownloadedBody {
    #[serde(rename = "uniqueID")]
    unique_id: String,
    version: String,
    os: String,
}

#[cfg(not(dev))]
fn os_to_string(os: String) -> Option<String> {
    match os.as_str() {
        "windows" => Some("Windows".into()),
        "macos" => Some("Mac_OS".into()),
        "linux" => Some("linux".into()),
        _ => None,
    }
}

#[cfg(not(dev))]
pub async fn increment_app_download_count(
    version: String,
) -> Result<tauri_plugin_http::reqwest::Response, Error> {
    let id = machine_uid::get().unwrap();
    let os = std::env::consts::OS.to_string();
    let os = os_to_string(os).ok_or(Error::OsNotFound)?;

    info!(
        "[Api] Incrementing app download count, id: {} - version: {} - os: {:?}",
        id, version, os
    );

    let body = DownloadedBody {
        unique_id: id,
        version,
        os,
    };

    let body = serde_json::to_string(&body).unwrap();

    let res = tauri_plugin_http::reqwest::ClientBuilder::new()
        .user_agent("GANYMEDE_TAURI_APP")
        .build()
        .map_err(Error::BuildClientBuilder)?
        .post(format!("{}/downloaded", GANYMEDE_API))
        .header("Content-Type", "application/json")
        .body(body)
        .send()
        .await
        .map_err(Error::RequestDownloaded)?;

    if res.status().is_success() {
        Ok(res)
    } else {
        Err(Error::DownloadedCount(
            res.status(),
            res.text().await.expect("[Api] failed to get response text"),
        ))
    }
}

#[derive(Deserialize)]
struct AppRelease {
    tag_name: String,
}

pub enum AppVersionError {
    GitHub(reqwest::Error),
    JsonMalformed(reqwest::Error),
    SemverParse(semver::Error),
}

impl Into<tauri::ipc::InvokeError> for AppVersionError {
    fn into(self) -> tauri::ipc::InvokeError {
        match self {
            AppVersionError::GitHub(err) => {
                tauri::ipc::InvokeError::from(format!("GitHub({})", err.to_string()))
            }
            AppVersionError::JsonMalformed(err) => {
                tauri::ipc::InvokeError::from(format!("JsonMalformed({})", err.to_string()))
            }
            AppVersionError::SemverParse(err) => {
                tauri::ipc::InvokeError::from(format!("SemverParse({})", err.to_string()))
            }
        }
    }
}

#[derive(Serialize)]
pub struct IsOld {
    from: String,
    to: String,
    #[serde(rename = "isOld")]
    is_old: bool,
}

#[tauri::command]
pub async fn is_app_version_old<R: Runtime>(app: AppHandle<R>) -> Result<IsOld, AppVersionError> {
    let version = app.package_info().version.to_string();

    let client = tauri_plugin_http::reqwest::ClientBuilder::new()
        .user_agent("GANYMEDE_TAURI_APP")
        .build()
        .unwrap();

    let res = client
        .get(format!("{}/releases/latest", GITHUB_API))
        .send()
        .await
        .map_err(AppVersionError::GitHub)?
        .json::<AppRelease>()
        .await
        .map_err(AppVersionError::JsonMalformed)?;

    let release_version = semver::VersionReq::parse(format!("<{}", res.tag_name).as_str())
        .map_err(AppVersionError::SemverParse)?;

    let version = semver::Version::parse(&version).unwrap();

    debug!(
        "[Api] version from package: {:?} - release_version from GitHub: {:?}",
        version, release_version
    );

    Ok(IsOld {
        from: version.to_string(),
        to: res.tag_name,
        is_old: release_version.matches(&version),
    })
}
