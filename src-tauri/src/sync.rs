use std::{collections::HashMap, fmt};

use chrono::{DateTime, Utc};
use log::{debug, info, warn};
use serde::{
    de::{self, MapAccess, SeqAccess, Visitor},
    Deserialize, Deserializer, Serialize,
};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_http::reqwest;

use crate::{
    api::GANYMEDE_API,
    check_auth,
    conf::{self, ConfStep},
    json,
    oauth::with_auth_retry,
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
    #[error("token expired")]
    TokenExpired,
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
    #[serde(deserialize_with = "deserialize_steps")]
    steps: HashMap<u32, ConfStep>,
    updated_at: String,
}

#[derive(Deserialize)]
struct UpdateProgressResponse {
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

/// The server stores steps as a JSON column: it echoes back an object keyed by step index
/// (`{"3": {...}}`) when indices are sparse, and a plain list when they are contiguous from 0.
fn deserialize_steps<'de, D>(deserializer: D) -> Result<HashMap<u32, ConfStep>, D::Error>
where
    D: Deserializer<'de>,
{
    struct StepsVisitor;

    impl<'de> Visitor<'de> for StepsVisitor {
        type Value = HashMap<u32, ConfStep>;

        fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
            formatter.write_str("a list of steps or a map of step index to step")
        }

        fn visit_unit<E: de::Error>(self) -> Result<Self::Value, E> {
            Ok(HashMap::new())
        }

        fn visit_none<E: de::Error>(self) -> Result<Self::Value, E> {
            Ok(HashMap::new())
        }

        fn visit_seq<A: SeqAccess<'de>>(self, mut seq: A) -> Result<Self::Value, A::Error> {
            let mut steps = HashMap::new();
            let mut index = 0u32;

            while let Some(step) = seq.next_element::<ConfStep>()? {
                steps.insert(index, step);
                index += 1;
            }

            Ok(steps)
        }

        fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
            let mut steps = HashMap::new();

            while let Some((key, step)) = map.next_entry::<String, ConfStep>()? {
                let index = key
                    .parse::<u32>()
                    .map_err(|_| de::Error::custom(format!("invalid step index: {}", key)))?;

                steps.insert(index, step);
            }

            Ok(steps)
        }
    }

    deserializer.deserialize_any(StepsVisitor)
}

fn parse_timestamp(value: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(value)
        .ok()
        .map(|date| date.with_timezone(&Utc))
}

fn is_remote_newer(local: Option<&String>, remote: &str) -> bool {
    let Some(local) = local else {
        return true;
    };

    match (parse_timestamp(local), parse_timestamp(remote)) {
        (Some(local), Some(remote)) => remote > local,
        _ => remote > local.as_str(),
    }
}

/// Aligns the local timestamp with the one the server assigned to the pushed progress, so a
/// later full sync does not consider the remote copy newer and overwrite untouched local data.
fn mark_progress_synced<R: Runtime>(
    app: &AppHandle<R>,
    server_id: u32,
    guide_id: u32,
    current_step: u32,
    steps: &HashMap<u32, ConfStep>,
    updated_at: &str,
) -> Result<(), Error> {
    let mut conf = conf::get_conf(app).map_err(Error::Conf)?;

    let Some(profile) = conf
        .profiles
        .iter_mut()
        .find(|p| p.server_id == Some(server_id))
    else {
        return Ok(());
    };

    let Some(progress) = profile.progresses.iter_mut().find(|p| p.id == guide_id) else {
        return Ok(());
    };

    // The local progress changed while the request was in flight: keep its own timestamp so the
    // pending change is still pushed on the next sync.
    if progress.current_step != current_step || &progress.steps != steps {
        return Ok(());
    }

    progress.updated_at = Some(updated_at.to_owned());

    conf::save_conf(&mut conf, app).map_err(Error::Conf)
}

async fn create_profile_on_server<R: Runtime>(
    http_client: &reqwest::Client,
    access_token: &str,
    name: &str,
    uuid: &str,
    app: &AppHandle<R>,
) -> Result<u32, Error> {
    let client = http_client.clone();
    let name_owned = name.to_owned();
    let uuid_owned = uuid.to_owned();

    let response = with_auth_retry(
        app,
        access_token,
        |token| {
            let client = client.clone();
            let name = name_owned.clone();
            let uuid = uuid_owned.clone();
            async move {
                client
                    .post(format!("{}/profiles", GANYMEDE_API))
                    .bearer_auth(&token)
                    .json(&serde_json::json!({ "name": name, "uuid": uuid }))
                    .send()
                    .await
                    .map_err(|e| Error::RequestFailed(e.to_string()))
            }
        },
        || Error::TokenExpired,
    )
    .await?;

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

    info!(
        "[Sync] Created remote profile '{}' with id {}",
        name, parsed.id
    );

    Ok(parsed.id)
}

async fn sync_progress_on_server<R: Runtime>(
    http_client: &reqwest::Client,
    access_token: &str,
    server_id: u32,
    guide_id: u32,
    current_step: u32,
    steps: &HashMap<u32, ConfStep>,
    app: &AppHandle<R>,
) -> Result<Option<String>, Error> {
    debug!(
        "[Sync] Syncing progress for profile {} guide {} - current_step: {}, steps: {:?}",
        server_id, guide_id, current_step, steps
    );

    let client = http_client.clone();
    let steps_owned = steps.clone();

    let response = with_auth_retry(
        app,
        access_token,
        |token| {
            let client = client.clone();
            let steps = steps_owned.clone();
            async move {
                client
                    .put(format!(
                        "{}/profiles/{}/progress/{}",
                        GANYMEDE_API, server_id, guide_id
                    ))
                    .bearer_auth(&token)
                    .json(&serde_json::json!({
                        "current_step": current_step,
                        "steps": steps,
                    }))
                    .send()
                    .await
                    .map_err(|e| {
                        if e.is_connect() || e.is_timeout() {
                            Error::NotConnected
                        } else {
                            Error::RequestFailed(e.to_string())
                        }
                    })
            }
        },
        || Error::TokenExpired,
    )
    .await?;

    if response.status() == 404 {
        return Err(Error::ProfileOrGuideNotFound);
    }

    if !response.status().is_success() {
        let status = response.status();
        let text = response
            .text()
            .await
            .unwrap_or_default()
            .replacen("\n", " ", 300);
        return Err(Error::RequestFailed(format!("HTTP {}: {}", status, text)));
    }

    debug!(
        "[Sync] Synced progress for profile {} guide {}",
        server_id, guide_id
    );

    let updated_at = match response.text().await {
        Ok(text) => json::from_str::<UpdateProgressResponse>(&text)
            .ok()
            .map(|parsed| parsed.updated_at),
        Err(err) => {
            warn!("[Sync] Could not read progress sync response: {}", err);

            None
        }
    };

    Ok(updated_at)
}

#[cfg(test)]
mod tests {
    use super::{is_remote_newer, RemoteProgressResponse};

    #[test]
    fn deserializes_steps_sent_back_as_an_indexed_map() {
        let json = r#"{"id":42,"current_step":3,"steps":{"3":{"checkboxes":[0,2]}},"updated_at":"2026-07-24T10:06:40.000000Z"}"#;

        let progress: RemoteProgressResponse = serde_json::from_str(json).unwrap();

        assert_eq!(progress.steps.len(), 1);
        assert_eq!(progress.steps[&3].checkboxes, vec![0, 2]);
    }

    #[test]
    fn deserializes_steps_sent_back_as_a_list() {
        let json = r#"{"id":42,"current_step":1,"steps":[{"checkboxes":[]},{"checkboxes":[1]}],"updated_at":"2026-07-24T10:06:40.000000Z"}"#;

        let progress: RemoteProgressResponse = serde_json::from_str(json).unwrap();

        assert_eq!(progress.steps.len(), 2);
        assert_eq!(progress.steps[&1].checkboxes, vec![1]);
    }

    #[test]
    fn deserializes_missing_steps() {
        let json =
            r#"{"id":42,"current_step":0,"steps":null,"updated_at":"2026-07-24T10:06:40.000000Z"}"#;

        let progress: RemoteProgressResponse = serde_json::from_str(json).unwrap();

        assert!(progress.steps.is_empty());
    }

    #[test]
    fn compares_timestamps_written_in_different_formats() {
        let local = "2026-07-24T10:06:40.123456789+00:00".to_string();

        assert!(is_remote_newer(Some(&local), "2026-07-24T10:06:41.000000Z"));
        assert!(!is_remote_newer(
            Some(&local),
            "2026-07-24T10:06:40.000000Z"
        ));
        assert!(is_remote_newer(None, "2026-07-24T10:06:40.000000Z"));
    }
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
    async fn sync_profiles<R: Runtime>(self, app: AppHandle<R>) -> Result<SyncResponse, Error> {
        let (http_client, access_token) =
            check_auth!(app, Error::TokenExpired, Error::TokensNotFound);
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

        let payload_owned = payload.clone();
        let response = with_auth_retry(
            &app,
            &access_token,
            |token| {
                let client = http_client.clone();
                let payload = payload_owned.clone();
                async move {
                    client
                        .post(format!("{}/profiles/sync", GANYMEDE_API))
                        .bearer_auth(&token)
                        .json(&serde_json::json!({ "profiles": payload }))
                        .send()
                        .await
                        .map_err(|e| {
                            if e.is_connect() || e.is_timeout() {
                                Error::NotConnected
                            } else {
                                Error::RequestFailed(e.to_string())
                            }
                        })
                }
            },
            || Error::TokenExpired,
        )
        .await?;

        if !response.status().is_success() {
            let status = response.status();

            warn!(
                "[Sync] payload sent for profiles sync: {}",
                serde_json::json!({ "profiles": payload })
            );

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
            let Some(ref uuid) = remote_profile.uuid else {
                continue;
            };
            if let Some(local_profile) = conf.profiles.iter_mut().find(|p| &p.id == uuid) {
                local_profile.server_id = Some(remote_profile.id);
                if local_profile.name != remote_profile.name {
                    local_profile.name = remote_profile.name.clone();
                }

                for remote_progress in &remote_profile.progresses {
                    if let Some(local_progress) = local_profile
                        .progresses
                        .iter_mut()
                        .find(|p| p.id == remote_progress.id)
                    {
                        let should_update = is_remote_newer(
                            local_progress.updated_at.as_ref(),
                            &remote_progress.updated_at,
                        );

                        if should_update {
                            local_progress.current_step = remote_progress.current_step;
                            local_progress.steps = remote_progress.steps.clone();
                            local_progress.updated_at = Some(remote_progress.updated_at.clone());
                        }
                    } else {
                        local_profile.progresses.push(conf::Progress {
                            id: remote_progress.id,
                            current_step: remote_progress.current_step,
                            steps: remote_progress.steps.clone(),
                            updated_at: Some(remote_progress.updated_at.clone()),
                        });
                    }
                }
            }
        }

        // Add new server profiles not in local
        for remote_profile in &server_response.profiles {
            let Some(ref uuid) = remote_profile.uuid else {
                continue;
            };
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
                            steps: p.steps.clone(),
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
            profiles: server_response
                .profiles
                .into_iter()
                .map(|rp| RemoteProfile {
                    id: rp.id,
                    uuid: rp.uuid,
                    name: rp.name,
                    progresses: rp
                        .progresses
                        .into_iter()
                        .map(|prog| SyncProgressPayload {
                            id: prog.id,
                            current_step: prog.current_step,
                            steps: prog.steps,
                            updated_at: prog.updated_at,
                        })
                        .collect(),
                })
                .collect(),
        })
    }

    async fn create_profile<R: Runtime>(
        self,
        app: AppHandle<R>,
        name: String,
        uuid: String,
    ) -> Result<u32, Error> {
        let (http_client, access_token) =
            check_auth!(app, Error::TokenExpired, Error::TokensNotFound);
        create_profile_on_server(&http_client, &access_token, &name, &uuid, &app).await
    }

    async fn rename_profile<R: Runtime>(
        self,
        app: AppHandle<R>,
        server_id: u32,
        name: String,
    ) -> Result<(), Error> {
        let (http_client, access_token) =
            check_auth!(app, Error::TokenExpired, Error::TokensNotFound);

        let response = with_auth_retry(
            &app,
            &access_token,
            |token| {
                let client = http_client.clone();
                let name = name.clone();
                async move {
                    client
                        .patch(format!("{}/profiles/{}", GANYMEDE_API, server_id))
                        .bearer_auth(&token)
                        .json(&serde_json::json!({ "name": name }))
                        .send()
                        .await
                        .map_err(|e| Error::RequestFailed(e.to_string()))
                }
            },
            || Error::TokenExpired,
        )
        .await?;

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
        let (http_client, access_token) =
            check_auth!(app, Error::TokenExpired, Error::TokensNotFound);

        let response = with_auth_retry(
            &app,
            &access_token,
            |token| {
                let client = http_client.clone();
                async move {
                    client
                        .delete(format!("{}/profiles/{}", GANYMEDE_API, server_id))
                        .bearer_auth(&token)
                        .send()
                        .await
                        .map_err(|e| Error::RequestFailed(e.to_string()))
                }
            },
            || Error::TokenExpired,
        )
        .await?;

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
        let (http_client, access_token) =
            check_auth!(app, Error::TokenExpired, Error::TokensNotFound);

        let updated_at = sync_progress_on_server(
            &http_client,
            &access_token,
            server_id,
            guide_id,
            current_step,
            &steps,
            &app,
        )
        .await?;

        if let Some(updated_at) = updated_at {
            // Best effort: the progress is already pushed, a local timestamp mismatch must not
            // surface as a sync failure.
            if let Err(err) =
                mark_progress_synced(&app, server_id, guide_id, current_step, &steps, &updated_at)
            {
                warn!(
                    "[Sync] Could not store the synced timestamp locally: {}",
                    err
                );
            }
        }

        Ok(())
    }
}
