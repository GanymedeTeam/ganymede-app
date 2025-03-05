use log::debug;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

// #[cfg(not(dev))]
use log::info;

pub const DOFUSDB_API: &str = "https://api.dofusdb.fr";
// #[cfg(not(dev))]
pub const GANYMEDE_API: &str = "https://ganymede-dofus.com/api";
pub const GANYMEDE_API_V2: &str = "https://ganymede-dofus.com/api/v2";

pub const API_KEY_HEADER: &str = "X-API-KEY";
pub const API_KEY: &str = env!("GANYMEDE_API_KEY");

const GITHUB_API: &str = "https://api.github.com/repos/GanymedeTeam/ganymede-app";

#[allow(dead_code)]
#[derive(Debug, Serialize, thiserror::Error)]
pub enum Error {
    #[error("failed to get os")]
    OsNotFound,
    #[error("failed to build client builder: {0}")]
    BuildClientBuilder(String),
    #[error("failed to request downloaded: {0}")]
    RequestDownloaded(String),
    #[error("failed to increment downloaded count: {0} - {1}")]
    DownloadedCount(String, String),
}

// #[cfg(not(dev))]
#[derive(Serialize)]
struct DownloadedBody {
    #[serde(rename = "uniqueID")]
    unique_id: String,
    version: String,
    os: String,
}

// #[cfg(not(dev))]
fn os_to_string(os: String) -> Option<String> {
    match os.as_str() {
        "windows" => Some("Windows".into()),
        "macos" => Some("Mac_OS".into()),
        "linux" => Some("linux".into()),
        _ => None,
    }
}

// #[cfg(not(dev))]
pub async fn increment_app_download_count(
    version: String,
    http_client: &tauri_plugin_http::reqwest::Client,
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

    let res = http_client
        .post(format!("{}/downloaded", GANYMEDE_API))
        .header(API_KEY_HEADER, API_KEY)
        .json(&body)
        .send()
        .await
        .map_err(|err| Error::RequestDownloaded(err.to_string()))?;

    if res.status().is_success() {
        Ok(res)
    } else {
        Err(Error::DownloadedCount(
            res.status().to_string(),
            res.text().await.expect("[Api] failed to get response text"),
        ))
    }
}

#[derive(Deserialize)]
struct AppRelease {
    tag_name: String,
}

#[derive(Debug, Serialize, thiserror::Error)]
pub enum AppVersionError {
    #[error("failed to get latest release from GitHub: {0}")]
    GitHub(String),
    #[error("failed to parse GitHub release json: {0}")]
    JsonMalformed(String),
    #[error("failed to parse semver: {0}")]
    SemverParse(String),
}

#[taurpc::ipc_type]
pub struct IsOld {
    from: String,
    to: String,
    #[serde(rename = "isOld")]
    is_old: bool,
}

#[taurpc::procedures(export_to = "../src/ipc/bindings.ts")]
pub trait Api {
    #[taurpc(alias = "isAppVersionOld")]
    async fn is_app_version_old(app_handle: AppHandle) -> Result<IsOld, AppVersionError>;
}

#[derive(Clone)]
pub struct ApiImpl;

#[taurpc::resolvers]
impl Api for ApiImpl {
    async fn is_app_version_old(self, app: AppHandle) -> Result<IsOld, AppVersionError> {
        let version = app.package_info().version.to_string();

        let client = tauri_plugin_http::reqwest::ClientBuilder::new()
            .user_agent("GANYMEDE_TAURI_APP")
            .build()
            .unwrap();

        let res = client
            .get(format!("{}/releases/latest", GITHUB_API))
            .send()
            .await
            .map_err(|err| AppVersionError::GitHub(err.to_string()))?
            .json::<AppRelease>()
            .await
            .map_err(|err| AppVersionError::JsonMalformed(err.to_string()))?;

        let release_version = semver::VersionReq::parse(format!("<{}", res.tag_name).as_str())
            .map_err(|err| AppVersionError::SemverParse(err.to_string()))?;

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
}
