use log::{debug, info};
use serde::Serialize;
use tauri::{AppHandle, Manager, Runtime};

use crate::{check_auth, json, oauth::with_auth_retry};

#[derive(Debug, thiserror::Error, Serialize, taurpc::specta::Type)]
#[specta(rename = "UserError")]
pub enum Error {
    #[error("tokens not found")]
    TokensNotFound,
    #[error("user not connected")]
    NotConnected,
    #[error("failed to get user: {0}")]
    FailedToGetUser(String),
    #[error("invalid user response: {0}")]
    InvalidUserResponse(String),
}

#[taurpc::ipc_type]
#[derive(Debug)]
pub struct User {
    pub id: u32,
    pub name: String,
    pub is_admin: u8,
    pub is_certified: u8,
    pub lang: String,
}

#[taurpc::procedures(path = "user", export_to = "../src/ipc/bindings.ts")]
pub trait UserApi {
    #[taurpc(alias = "getMe")]
    async fn get_me<R: Runtime>(app_handle: AppHandle<R>) -> Result<User, Error>;
}

#[derive(Clone)]
pub struct UserApiImpl;

#[taurpc::resolvers]
impl UserApi for UserApiImpl {
    async fn get_me<R: Runtime>(self, app_handle: AppHandle<R>) -> Result<User, Error> {
        let (http_client, access_token) =
            check_auth!(app_handle, Error::NotConnected, Error::TokensNotFound);

        let response = with_auth_retry(
            &app_handle,
            &access_token,
            |token| {
                let client = http_client.clone();
                async move {
                    client
                        .get(format!("{}/me", crate::api::GANYMEDE_API))
                        .bearer_auth(&token)
                        .send()
                        .await
                        .map_err(|err| {
                            if err.is_connect() || err.is_timeout() {
                                Error::NotConnected
                            } else {
                                Error::FailedToGetUser(format!("Request failed: {}", err))
                            }
                        })
                }
            },
            || Error::NotConnected,
        )
        .await?;

        let response_text = response
            .text()
            .await
            .map_err(|err| Error::FailedToGetUser(format!("reading response text: {}", err)))?;

        debug!("[User] Received me response from server");

        let user: User = json::from_str(&response_text)
            .map_err(|e| Error::InvalidUserResponse(format!("JSON parse error: {}", e)))?;

        info!("[User] Successfully get me");

        Ok(user)
    }
}
