use crate::{api::GANYMEDE_API, tauri_api_ext::ViewedNotificationsPathExt};
use log::{debug, error, info};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use tauri::{AppHandle, Manager};
use tauri_plugin_http::reqwest;

#[derive(Debug, Serialize, thiserror::Error)]
pub enum Error {
    #[error("failed to get viewed notifications, file is malformed")]
    Malformed(#[from] crate::json::Error),
    #[error("failed to serialize viewed notifications")]
    SerializeViewedNotifications(crate::json::Error),
    #[error("unhandled io error: {0}")]
    UnhandledIo(String),
    #[error("failed to save viewed notifications: {0}")]
    SaveViewedNotifications(String),
    #[error("failed to fetch notifications from API: {0}")]
    FetchNotifications(String),
    #[error("failed to parse API response: {0}")]
    ParseApiResponse(String),
}

#[derive(Serialize, Deserialize, Debug, Clone, taurpc::specta::Type)]
pub struct Notification {
    pub id: u32,
    pub text: String,
    pub display_at: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, taurpc::specta::Type)]
pub struct ViewedNotifications {
    pub viewed_ids: HashSet<u32>,
}

impl Default for ViewedNotifications {
    fn default() -> Self {
        ViewedNotifications {
            viewed_ids: HashSet::new(),
        }
    }
}

impl ViewedNotifications {
    /// Get viewed notifications from file, if it doesn't exist, return default
    pub fn get(app: &AppHandle) -> Result<ViewedNotifications, Error> {
        let viewed_notifications_path = app.path().app_viewed_notifications_file();

        let file = fs::read_to_string(viewed_notifications_path);

        match file {
            Err(err) => match err.kind() {
                std::io::ErrorKind::NotFound => Ok(ViewedNotifications::default()),
                _ => Err(Error::UnhandledIo(err.to_string())),
            },
            Ok(file) => Ok(crate::json::from_str::<ViewedNotifications>(file.as_str())
                .map_err(Error::Malformed)?),
        }
    }

    /// Save viewed notifications to file
    pub fn save(&self, app: &AppHandle) -> Result<(), Error> {
        let viewed_notifications_path = app.path().app_viewed_notifications_file();

        let json =
            crate::json::serialize_pretty(self).map_err(Error::SerializeViewedNotifications)?;

        fs::write(viewed_notifications_path, json)
            .map_err(|err| Error::SaveViewedNotifications(err.to_string()))
    }

    /// Mark a notification as viewed
    pub fn mark_as_viewed(&mut self, notification_id: u32) {
        self.viewed_ids.insert(notification_id);
    }

    /// Check if a notification has been viewed
    pub fn is_viewed(&self, notification_id: u32) -> bool {
        self.viewed_ids.contains(&notification_id)
    }
}

/// Fetch notifications from the API
async fn fetch_notifications_from_api(app_handle: &AppHandle) -> Result<Vec<Notification>, Error> {
    let client = app_handle.state::<reqwest::Client>();

    debug!("[Notifications] Fetching notifications from API");

    let response = client
        // .get(format!("{}/v2/notifications", GANYMEDE_API))
        .get(format!(
            "{}/v2/notifications",
            "https://dev.ganymede-dofus.com/api"
        ))
        .send()
        .await
        .map_err(|err| Error::FetchNotifications(err.to_string()))?;

    if !response.status().is_success() {
        return Err(Error::FetchNotifications(format!(
            "API returned status: {}",
            response.status()
        )));
    }

    let notifications: Vec<Notification> = response
        .json()
        .await
        .map_err(|err| Error::ParseApiResponse(err.to_string()))?;

    info!(
        "[Notifications] Fetched {} notifications",
        notifications.len()
    );

    Ok(notifications)
}

#[taurpc::procedures(path = "notifications", export_to = "../src/ipc/bindings.ts")]
pub trait NotificationApi {
    #[taurpc(alias = "getUnviewedNotifications")]
    async fn get_unviewed_notifications(app_handle: AppHandle) -> Result<Vec<Notification>, Error>;
    #[taurpc(alias = "markNotificationAsViewed")]
    async fn mark_notification_as_viewed(
        app_handle: AppHandle,
        notification_id: u32,
    ) -> Result<(), Error>;
    #[taurpc(alias = "getViewedNotifications")]
    async fn get_viewed_notifications(app_handle: AppHandle) -> Result<ViewedNotifications, Error>;
}

#[derive(Clone)]
pub struct NotificationApiImpl;

#[taurpc::resolvers]
impl NotificationApi for NotificationApiImpl {
    async fn get_unviewed_notifications(self, app: AppHandle) -> Result<Vec<Notification>, Error> {
        let notifications = fetch_notifications_from_api(&app).await?;
        let viewed_notifications = ViewedNotifications::get(&app)?;

        let unviewed: Vec<Notification> = notifications
            .into_iter()
            .filter(|notification| !viewed_notifications.is_viewed(notification.id))
            .collect();

        debug!(
            "[Notifications] Found {} unviewed notifications",
            unviewed.len()
        );

        Ok(unviewed)
    }

    async fn mark_notification_as_viewed(
        self,
        app: AppHandle,
        notification_id: u32,
    ) -> Result<(), Error> {
        debug!(
            "[Notifications] Marking notification {} as viewed",
            notification_id
        );

        let mut viewed_notifications = ViewedNotifications::get(&app)?;
        viewed_notifications.mark_as_viewed(notification_id);
        viewed_notifications.save(&app)?;

        info!(
            "[Notifications] Notification {} marked as viewed",
            notification_id
        );

        Ok(())
    }

    async fn get_viewed_notifications(self, app: AppHandle) -> Result<ViewedNotifications, Error> {
        ViewedNotifications::get(&app)
    }
}
