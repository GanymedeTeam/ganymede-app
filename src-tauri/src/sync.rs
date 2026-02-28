use std::collections::HashMap;

use log::{debug, info, warn};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_http::reqwest;

use crate::{
    api::GANYMEDE_API,
    conf::{self, ConfStep},
    json,
    oauth::load_auth_tokens,
};

// Enums

#[derive(Debug, thiserror::Error, Serialize, taurpc::specta::Type)]
#[specta(rename = "SyncError")]
pub enum Error {
    #[error("tokens not found")]
    TokensNotFound,
    #[error("user not connected")]
    NotConnected,
    #[error("request failed: {0}")]
    RequestFailed(String),
    #[error("invalid response: {0}")]
    InvalidResponse(String),
    #[error("conf error: {0}")]
    Conf(conf::Error),
    #[error("profile or guide not found on server")]
    ProfileOrGuideNotFound,
    #[error("validation error: {0}")]
    ValidationError(String),
}

// Structs

#[taurpc::ipc_type]
#[derive(Debug)]
pub struct SyncProgressPayload {
    pub id: u32,
    pub current_step: u32,
    pub steps: HashMap<u32, ConfStep>,
    pub updated_at: String,
}

#[taurpc::ipc_type]
#[derive(Debug)]
pub struct SyncProfilePayload {
    pub uuid: String,
    pub name: String,
    pub progresses: Vec<SyncProgressPayload>,
}

#[taurpc::ipc_type]
#[derive(Debug)]
pub struct RemoteProfile {
    pub id: u32,
    pub uuid: Option<String>,
    pub name: String,
    pub progresses: Vec<SyncProgressPayload>,
}

#[taurpc::ipc_type]
#[derive(Debug)]
pub struct SyncResponse {
    pub profiles: Vec<RemoteProfile>,
}

#[derive(Deserialize)]
struct CreateProfileResponse {
    id: u32,
}

#[derive(Deserialize)]
struct RemoteProgressResponse {
    id: u32,
    current_step: u32,
    steps: Vec<ConfStep>,
    updated_at: String,
}

#[derive(Deserialize)]
struct RemoteProfileResponse {
    id: u32,
    uuid: Option<String>,
    name: String,
    progresses: Vec<RemoteProgressResponse>,
}

#[derive(Deserialize)]
struct SyncServerResponse {
    profiles: Vec<RemoteProfileResponse>,
}

// Functions

fn get_auth<R: Runtime>(app: &AppHandle<R>) -> Result<(reqwest::Client, String), Error> {
    let http_client = app.state::<reqwest::Client>().inner().clone();
    let tokens = load_auth_tokens(app)
        .map_err(|_| Error::TokensNotFound)?
        .ok_or(Error::TokensNotFound)?;

    Ok((http_client, tokens.access_token))
}

async fn create_profile_on_server(
    http_client: &reqwest::Client,
    access_token: &str,
    name: &str,
    uuid: &str,
) -> Result<u32, Error> {
    let response = http_client
        .post(format!("{}/profiles", GANYMEDE_API))
        .bearer_auth(access_token)
        .json(&serde_json::json!({ "name": name, "uuid": uuid }))
        .send()
        .await
        .map_err(|e| Error::RequestFailed(e.to_string()))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(Error::RequestFailed(format!("HTTP {}: {}", status, text)));
    }

    let text = response
        .text()
        .await
        .map_err(|e| Error::RequestFailed(e.to_string()))?;

    let parsed: CreateProfileResponse =
        json::from_str(&text).map_err(|e| Error::InvalidResponse(e.to_string()))?;

    info!("[Sync] Created remote profile '{}' with id {}", name, parsed.id);

    Ok(parsed.id)
}

async fn sync_progress_on_server(
    http_client: &reqwest::Client,
    access_token: &str,
    server_id: u32,
    guide_id: u32,
    current_step: u32,
    steps: &HashMap<u32, ConfStep>,
) -> Result<(), Error> {
    debug!("[Sync] Syncing progress for profile {} guide {} - current_step: {}, steps: {:?}", server_id, guide_id, current_step, steps);

    let response = http_client
        .put(format!(
            "{}/profiles/{}/progress/{}",
            GANYMEDE_API, server_id, guide_id
        ))
        .bearer_auth(access_token)
        .json(&serde_json::json!({
            "current_step": current_step,
            "steps": steps,
        }))
        .send()
        .await
        .map_err(|e| Error::RequestFailed(e.to_string()))?;

    if response.status() == 404 {
        return Err(Error::ProfileOrGuideNotFound);
    }

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default().replacen("\n", " ", 300);
        return Err(Error::RequestFailed(format!("HTTP {}: {}", status, text)));
    }

    debug!(
        "[Sync] Synced progress for profile {} guide {}",
        server_id, guide_id
    );

    Ok(())
}

// TauRPC API

#[taurpc::procedures(path = "sync", export_to = "../src/ipc/bindings.ts")]
pub trait SyncApi {
    #[taurpc(alias = "syncProfiles")]
    async fn sync_profiles<R: Runtime>(app_handle: AppHandle<R>) -> Result<SyncResponse, Error>;

    #[taurpc(alias = "createProfile")]
    async fn create_profile<R: Runtime>(
        app_handle: AppHandle<R>,
        name: String,
        uuid: String,
    ) -> Result<u32, Error>;

    #[taurpc(alias = "renameProfile")]
    async fn rename_profile<R: Runtime>(
        app_handle: AppHandle<R>,
        server_id: u32,
        name: String,
    ) -> Result<(), Error>;

    #[taurpc(alias = "deleteProfile")]
    async fn delete_profile<R: Runtime>(
        app_handle: AppHandle<R>,
        server_id: u32,
    ) -> Result<(), Error>;

    #[taurpc(alias = "syncProgress")]
    async fn sync_progress<R: Runtime>(
        app_handle: AppHandle<R>,
        server_id: u32,
        guide_id: u32,
        current_step: u32,
        steps: HashMap<u32, ConfStep>,
    ) -> Result<(), Error>;
}

#[derive(Clone)]
pub struct SyncApiImpl;

#[taurpc::resolvers]
impl SyncApi for SyncApiImpl {
    async fn sync_profiles<R: Runtime>(
        self,
        app: AppHandle<R>,
    ) -> Result<SyncResponse, Error> {
        let (http_client, access_token) = get_auth(&app)?;
        let conf = conf::get_conf(&app).map_err(Error::Conf)?;

        let payload: Vec<SyncProfilePayload> = conf
            .profiles
            .iter()
            .map(|p| SyncProfilePayload {
                uuid: p.id.clone(),
                name: p.name.clone(),
                progresses: p
                    .progresses
                    .iter()
                    .map(|prog| SyncProgressPayload {
                        id: prog.id,
                        current_step: prog.current_step,
                        steps: prog.steps.clone(),
                        updated_at: prog
                            .updated_at
                            .clone()
                            .unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
                    })
                    .collect(),
            })
            .collect();

        info!("[Sync] Sending profiles sync request to server");

        let response = http_client
            .post(format!("{}/profiles/sync", GANYMEDE_API))
            .bearer_auth(&access_token)
            .json(&serde_json::json!({ "profiles": payload }))
            .send()
            .await
            .map_err(|e| Error::RequestFailed(e.to_string()))?;

        if response.url().as_str().ends_with("/login") {
            return Err(Error::NotConnected);
        }

        if !response.status().is_success() {
            let status = response.status();

            warn!("[Sync] payload sent for profiles sync: {}", serde_json::json!({ "profiles": payload }));

            if status == 422 {
                let text = response.text().await.unwrap_or_default();

                warn!("[Sync] HTTP 422 from server: {}", text);

                return Err(Error::ValidationError(text));
            }

            return Err(Error::RequestFailed(format!("HTTP {}", status)));
        }

        let text = response
            .text()
            .await
            .map_err(|e| Error::RequestFailed(e.to_string()))?;

        debug!("[Sync] Received sync response from server: {}", text);

        let server_response: SyncServerResponse =
            json::from_str(&text).map_err(|e| Error::InvalidResponse(e.to_string()))?;

        // Merge server data into local conf
        let mut conf = conf::get_conf(&app).map_err(Error::Conf)?;

        for remote_profile in &server_response.profiles {
            let Some(ref uuid) = remote_profile.uuid else { continue };
            if let Some(local_profile) = conf.profiles.iter_mut().find(|p| &p.id == uuid) {
                local_profile.server_id = Some(remote_profile.id);

                for remote_progress in &remote_profile.progresses {
                    let remote_steps: HashMap<u32, ConfStep> = remote_progress
                        .steps
                        .iter()
                        .enumerate()
                        .map(|(i, s)| (i as u32, s.clone()))
                        .collect();

                    if let Some(local_progress) = local_profile
                        .progresses
                        .iter_mut()
                        .find(|p| p.id == remote_progress.id)
                    {
                        let should_update = match (&local_progress.updated_at, &remote_progress.updated_at) {
                            (Some(local_ts), remote_ts) => remote_ts > local_ts,
                            (None, _) => true,
                        };

                        if should_update {
                            local_progress.current_step = remote_progress.current_step;
                            local_progress.steps = remote_steps;
                            local_progress.updated_at = Some(remote_progress.updated_at.clone());
                        }
                    } else {
                        local_profile.progresses.push(conf::Progress {
                            id: remote_progress.id,
                            current_step: remote_progress.current_step,
                            steps: remote_steps,
                            updated_at: Some(remote_progress.updated_at.clone()),
                        });
                    }
                }
            }
        }

        // Add new server profiles not in local
        for remote_profile in &server_response.profiles {
            let Some(ref uuid) = remote_profile.uuid else { continue };
            if !conf.profiles.iter().any(|p| &p.id == uuid) {
                conf.profiles.push(conf::Profile {
                    id: uuid.clone(),
                    name: remote_profile.name.clone(),
                    level: 200,
                    progresses: remote_profile
                        .progresses
                        .iter()
                        .map(|p| conf::Progress {
                            id: p.id,
                            current_step: p.current_step,
                            steps: p.steps.iter().enumerate().map(|(i, s)| (i as u32, s.clone())).collect(),
                            updated_at: Some(p.updated_at.clone()),
                        })
                        .collect(),
                    server_id: Some(remote_profile.id),
                });
            }
        }

        conf::save_conf(&mut conf, &app).map_err(Error::Conf)?;

        info!("[Sync] Initial sync completed successfully");

        Ok(SyncResponse {
            profiles: server_response.profiles.into_iter().map(|rp| RemoteProfile {
                id: rp.id,
                uuid: rp.uuid,
                name: rp.name,
                progresses: rp.progresses.into_iter().map(|prog| SyncProgressPayload {
                    id: prog.id,
                    current_step: prog.current_step,
                    steps: prog.steps.into_iter().enumerate().map(|(i, s)| (i as u32, s)).collect(),
                    updated_at: prog.updated_at,
                }).collect(),
            }).collect(),
        })
    }

    async fn create_profile<R: Runtime>(
        self,
        app: AppHandle<R>,
        name: String,
        uuid: String,
    ) -> Result<u32, Error> {
        let (http_client, access_token) = get_auth(&app)?;
        create_profile_on_server(&http_client, &access_token, &name, &uuid).await
    }

    async fn rename_profile<R: Runtime>(
        self,
        app: AppHandle<R>,
        server_id: u32,
        name: String,
    ) -> Result<(), Error> {
        let (http_client, access_token) = get_auth(&app)?;

        let response = http_client
            .patch(format!("{}/profiles/{}", GANYMEDE_API, server_id))
            .bearer_auth(&access_token)
            .json(&serde_json::json!({ "name": name }))
            .send()
            .await
            .map_err(|e| Error::RequestFailed(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(Error::RequestFailed(format!("HTTP {}: {}", status, text)));
        }

        info!("[Sync] Renamed remote profile {} to '{}'", server_id, name);

        Ok(())
    }

    async fn delete_profile<R: Runtime>(
        self,
        app: AppHandle<R>,
        server_id: u32,
    ) -> Result<(), Error> {
        let (http_client, access_token) = get_auth(&app)?;

        let response = http_client
            .delete(format!("{}/profiles/{}", GANYMEDE_API, server_id))
            .bearer_auth(&access_token)
            .send()
            .await
            .map_err(|e| Error::RequestFailed(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(Error::RequestFailed(format!("HTTP {}: {}", status, text)));
        }

        info!("[Sync] Deleted remote profile {}", server_id);

        Ok(())
    }

    async fn sync_progress<R: Runtime>(
        self,
        app: AppHandle<R>,
        server_id: u32,
        guide_id: u32,
        current_step: u32,
        steps: HashMap<u32, ConfStep>,
    ) -> Result<(), Error> {
        let (http_client, access_token) = get_auth(&app)?;

        sync_progress_on_server(&http_client, &access_token, server_id, guide_id, current_step, &steps).await
    }
}
