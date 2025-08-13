use crate::api::{API_KEY, API_KEY_HEADER, GANYMEDE_API};
use log::{debug, info};
use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_http::reqwest;

#[derive(thiserror::Error, Debug, Serialize)]
pub enum Error {
    #[error("failed to save report: {0}")]
    Server(String),
    #[error("failed to save report with status: {0}: {1}")]
    Status(u16, String),
}

#[taurpc::ipc_type]
pub struct ReportPayload {
    pub username: Option<String>,
    pub content: String,
    pub step: u32,
    pub guide_id: u32,
}

#[derive(Serialize)]
pub struct ReportApiPayload {
    pub username: String,
    pub content: String,
    pub step: u32,
    pub guide_id: u32,
}

impl From<ReportPayload> for ReportApiPayload {
    fn from(value: ReportPayload) -> Self {
        ReportApiPayload {
            username: value
                .username
                .unwrap_or_else(|| "Anonyme".to_string())
                .chars()
                .take(255)
                .collect(),
            content: value.content,
            step: value.step,
            guide_id: value.guide_id,
        }
    }
}

#[taurpc::procedures(path = "report", export_to = "../src/ipc/bindings.ts")]
pub trait ReportApi {
    async fn send_report(app_handle: AppHandle, payload: ReportPayload) -> Result<(), Error>;
}

#[derive(Clone)]
pub struct ReportApiImpl;

#[taurpc::resolvers]
impl ReportApi for ReportApiImpl {
    async fn send_report(self, app_handle: AppHandle, payload: ReportPayload) -> Result<(), Error> {
        let http_client = app_handle.state::<reqwest::Client>();

        info!(
            "[Report] send_report: GuideId = {}, Step = {}",
            payload.guide_id, payload.step
        );

        let res = http_client
            .post(format!(
                "{}/v2/guides/{}/report",
                GANYMEDE_API, payload.guide_id
            ))
            .header(API_KEY_HEADER, API_KEY)
            .json(&Into::<ReportApiPayload>::into(payload))
            .send()
            .await
            .map_err(|err| Error::Server(err.to_string()))?;

        debug!("[Report] send_report—response = {:?}", res);

        res.error_for_status_ref().map_err(|err| {
            Error::Status(
                err.status()
                    .map_or_else(|| 500 as u16, |status| status.as_u16()),
                err.to_string(),
            )
        })?;

        Ok(())
    }
}
