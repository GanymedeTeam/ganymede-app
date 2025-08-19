use log::debug;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};

#[derive(Debug, Serialize, thiserror::Error, taurpc::specta::Type)]
pub enum Error {
    #[error("failed to build client builder: {0}")]
    BuildClientBuilder(String),
}

pub const DOFUSDB_API: &str = "https://api.dofusdb.fr";
pub const GANYMEDE_API: &str = "https://ganymede-app.com/api";

pub const API_KEY_HEADER: &str = "X-API-KEY";
pub const API_KEY: &str = env!("GANYMEDE_API_KEY");

#[derive(Deserialize)]
struct AppRelease {
    tag_name: String,
}

#[derive(Debug, Serialize, thiserror::Error, taurpc::specta::Type)]
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

#[taurpc::procedures(path = "api", export_to = "../src/ipc/bindings.ts")]
pub trait Api {
    #[taurpc(alias = "isAppVersionOld")]
    async fn is_app_version_old<R: Runtime>(
        app_handle: AppHandle<R>,
    ) -> Result<IsOld, AppVersionError>;
}

#[derive(Clone)]
pub struct ApiImpl;

#[taurpc::resolvers]
impl Api for ApiImpl {
    async fn is_app_version_old<R: Runtime>(
        self,
        app: AppHandle<R>,
    ) -> Result<IsOld, AppVersionError> {
        let version = app.package_info().version.to_string();

        let client = tauri_plugin_http::reqwest::ClientBuilder::new()
            .user_agent("GANYMEDE_TAURI_APP")
            .build()
            .unwrap();

        let res = client
            .get(format!("{}/github/latest-release", GANYMEDE_API))
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
