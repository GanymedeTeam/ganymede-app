use crate::api::GANYMEDE_WEBSITE;
use crate::json;
use crate::tauri_api_ext::AuthPathExt;
use base64::{engine::general_purpose, Engine as _};
use log::{debug, error, info};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::sync::{LazyLock, Mutex};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_http::reqwest;
use tauri_plugin_opener::OpenerExt;
use uuid::Uuid;

pub const CLIENT_ID: &str = env!("GANYMEDE_CLIENT_ID");
const REDIRECT_URI: &str = "ganymede://oauth/callback";

// Stockage global en mémoire pour les états OAuth
static OAUTH_STATES: LazyLock<Mutex<HashMap<String, String>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, Serialize, thiserror::Error, taurpc::specta::Type)]
#[specta(rename = "OAuthError")]
pub enum Error {
    #[error("failed to open browser: {0}")]
    OpenBrowser(String),
    #[error("failed to save auth: {0}")]
    SaveAuth(String),
    #[error("failed to load auth: {0}")]
    LoadAuth(String),
    #[error("failed to clean auth: {0}")]
    CleanAuth(String),
    #[error("failed to serialize/deserialize JSON: {0}")]
    Json(#[from] json::Error),
    #[error("failed to exchange code for tokens: {0}")]
    TokenExchange(String),
    #[error("invalid token response from server: {0}")]
    InvalidTokenResponse(String),
}

#[derive(Debug)]
#[taurpc::ipc_type]
pub struct AuthTokens {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: Option<u32>,
    pub token_type: String,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: Option<u64>,
    pub token_type: String,
}

#[taurpc::procedures(
    path = "oauth",
    event_trigger = OAuthApiEventTrigger,
    export_to = "../src/ipc/bindings.ts"
)]
pub trait OAuthApi {
    #[taurpc(alias = "startOAuthFlow")]
    async fn start_oauth_flow<R: Runtime>(app_handle: AppHandle<R>) -> Result<(), Error>;

    #[taurpc(alias = "getAuthTokens")]
    async fn get_auth_tokens<R: Runtime>(
        app_handle: AppHandle<R>,
    ) -> Result<Option<AuthTokens>, Error>;

    #[taurpc(alias = "cleanAuthTokens")]
    async fn clean_auth_tokens<R: Runtime>(
        app_handle: AppHandle<R>,
    ) -> Result<Option<AuthTokens>, Error>;

    #[taurpc(event)]
    #[taurpc(alias = "onOAuthFlowEnd")]
    async fn on_oauth_flow_end();
}

#[derive(Clone)]
pub struct OAuthApiImpl;

#[taurpc::resolvers]
impl OAuthApi for OAuthApiImpl {
    async fn start_oauth_flow<R: Runtime>(self, app_handle: AppHandle<R>) -> Result<(), Error> {
        let (code_verifier, code_challenge) = generate_pkce_challenge();
        let state_id = Uuid::new_v4().to_string();

        save_oauth_state_memory(&state_id, &code_verifier)?;

        let auth_url = build_authorization_url(&code_challenge, &state_id);
        debug!("[OAuth] Opening authorization URL: {}", auth_url);

        app_handle
            .opener()
            .open_url(&auth_url, None::<String>)
            .map_err(|e| Error::OpenBrowser(e.to_string()))?;

        debug!(
            "[OAuth] OAuth flow started successfully with state ID: {}",
            state_id
        );
        Ok(())
    }

    async fn get_auth_tokens<R: Runtime>(
        self,
        app_handle: AppHandle<R>,
    ) -> Result<Option<AuthTokens>, Error> {
        load_auth_tokens(&app_handle)
    }

    async fn clean_auth_tokens<R: Runtime>(
        self,
        app_handle: AppHandle<R>,
    ) -> Result<Option<AuthTokens>, Error> {
        clean_auth_tokens(&app_handle)
    }
}

fn generate_pkce_challenge() -> (String, String) {
    let mut rng = rand::rng();
    // RFC 7636 compliant alphabet: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
    let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    let code_verifier: String = (0..128)
        .map(|_| {
            let idx = rng.random_range(0..alphabet.len());
            alphabet.chars().nth(idx).unwrap()
        })
        .collect();

    let mut hasher = Sha256::new();
    hasher.update(code_verifier.as_bytes());
    let hash = hasher.finalize();

    let code_challenge = general_purpose::URL_SAFE_NO_PAD.encode(hash);

    debug!("[OAuth] Generated PKCE challenge (RFC 7636 compliant)");
    (code_verifier, code_challenge)
}

fn build_authorization_url(code_challenge: &str, state: &str) -> String {
    format!(
        "{}/oauth/authorize?response_type=code&client_id={}&code_challenge={}&code_challenge_method=S256&state={}&redirect_uri={}",
        GANYMEDE_WEBSITE,
        CLIENT_ID,
        code_challenge,
        state,
        urlencoding::encode(REDIRECT_URI)
    )
}

async fn exchange_code_for_tokens<R: Runtime>(
    app_handle: &AppHandle<R>,
    code: &str,
    code_verifier: &str,
) -> Result<AuthTokens, Error> {
    debug!("[OAuth] Exchanging authorization code for tokens");

    let http_client = app_handle.state::<reqwest::Client>();
    let token_url = format!("{}/oauth/token", GANYMEDE_WEBSITE);

    let params = [
        ("grant_type", "authorization_code"),
        ("code", code),
        ("client_id", CLIENT_ID),
        ("code_verifier", code_verifier),
        ("redirect_uri", REDIRECT_URI),
    ];

    let response = http_client
        .post(&token_url)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&params)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| Error::TokenExchange(format!("Request failed: {}", e)))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(Error::TokenExchange(format!(
            "HTTP {}: {}",
            status, error_text
        )));
    }

    let response_text = response
        .text()
        .await
        .map_err(|e| Error::TokenExchange(format!("Failed to read response: {}", e)))?;

    debug!("[OAuth] Received token response from server");

    let token_response: TokenResponse = json::from_str(&response_text)
        .map_err(|e| Error::InvalidTokenResponse(format!("JSON parse error: {}", e)))?;

    let expires_at = token_response.expires_in.map(|expires_in| {
        (std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
            + expires_in) as u32
    });

    Ok(AuthTokens {
        access_token: token_response.access_token,
        refresh_token: token_response.refresh_token,
        expires_at,
        token_type: token_response.token_type,
    })
}

pub async fn handle_oauth_callback_directly<R: Runtime>(
    app_handle: &AppHandle<R>,
    code: &str,
    state_id: &str,
) -> Result<(), Error> {
    debug!(
        "[OAuth] Handling OAuth callback directly from deep link with state ID: {}",
        state_id
    );

    let code_verifier = load_oauth_state_memory(state_id)?;
    let tokens = exchange_code_for_tokens(app_handle, code, &code_verifier).await?;
    save_auth_tokens(app_handle, &tokens)?;
    cleanup_oauth_state_memory(state_id);

    let trigger = OAuthApiEventTrigger::new(app_handle.clone());

    match trigger.on_oauth_flow_end() {
        Ok(_) => {
            info!("[OAuth] OAuth authentication completed successfully");
        }
        Err(e) => {
            error!("[OAuth] OAuth authentication failed: {}", e);
        }
    };

    Ok(())
}

fn save_oauth_state_memory(state_id: &str, code_verifier: &str) -> Result<(), Error> {
    debug!("[OAuth] Saving OAuth state in memory with ID: {}", state_id);
    let mut states = OAUTH_STATES
        .lock()
        .map_err(|e| Error::SaveAuth(format!("Failed to lock OAuth states: {}", e)))?;
    states.insert(state_id.to_string(), code_verifier.to_string());
    Ok(())
}

fn load_oauth_state_memory(state_id: &str) -> Result<String, Error> {
    debug!(
        "[OAuth] Loading OAuth state from memory with ID: {}",
        state_id
    );
    let states = OAUTH_STATES
        .lock()
        .map_err(|e| Error::LoadAuth(format!("Failed to lock OAuth states: {}", e)))?;
    states
        .get(state_id)
        .cloned()
        .ok_or_else(|| Error::LoadAuth(format!("No OAuth state found for ID: {}", state_id)))
}

fn cleanup_oauth_state_memory(state_id: &str) {
    debug!(
        "[OAuth] Cleaning up OAuth state from memory with ID: {}",
        state_id
    );
    if let Ok(mut states) = OAUTH_STATES.lock() {
        states.remove(state_id);
    }
}

fn save_auth_tokens<R: Runtime>(
    app_handle: &AppHandle<R>,
    tokens: &AuthTokens,
) -> Result<(), Error> {
    let path = app_handle.path().app_auth_file();
    let json = json::serialize_pretty(tokens)?;
    fs::write(&path, json).map_err(|e| Error::SaveAuth(e.to_string()))?;
    Ok(())
}

fn clean_auth_tokens<R: Runtime>(app_handle: &AppHandle<R>) -> Result<Option<AuthTokens>, Error> {
    let path = app_handle.path().app_auth_file();

    if path.exists() {
        fs::remove_file(&path).map_err(|e| Error::CleanAuth(e.to_string()))?;
        info!("[OAuth] Cleared authentication tokens");
        Ok(None)
    } else {
        debug!("[OAuth] No authentication tokens to clear");
        Ok(None)
    }
}

pub fn load_auth_tokens<R: Runtime>(
    app_handle: &AppHandle<R>,
) -> Result<Option<AuthTokens>, Error> {
    let path = app_handle.path().app_auth_file();
    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&path).map_err(|e| Error::LoadAuth(e.to_string()))?;
    let tokens: AuthTokens = json::from_str(&content)?;
    Ok(Some(tokens))
}
