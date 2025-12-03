use std::path::PathBuf;
use chrono::{Datelike, Timelike};
use tauri::path::PathResolver;
use tauri::Runtime;

const APP_CONFIG_FILE: &str = "conf.json";
const APP_GUIDES_DIR: &str = "guides";
const APP_RECENT_GUIDES_FILE: &str = "recent_guides.json";
const APP_FIRST_TIME_START_FILE: &str = "first_time_start.json";
const APP_VIEWED_NOTIFICATIONS_FILE: &str = "viewed_notifications.json";
const APP_AUTH_FILE: &str = "auth.json";

pub trait ConfPathExt {
    fn app_conf_file(&self) -> PathBuf;
    fn app_conf_backup_file(&self) -> PathBuf;
}

pub trait GuidesPathExt {
    fn app_guides_dir(&self) -> PathBuf;
    fn app_recent_guides_file(&self) -> PathBuf;
}

pub trait FirstTimePathExt {
    fn app_first_time_start(&self) -> PathBuf;
}

pub trait ViewedNotificationsPathExt {
    fn app_viewed_notifications_file(&self) -> PathBuf;
}

pub trait AuthPathExt {
    fn app_auth_file(&self) -> PathBuf;
}

impl<R: Runtime> ConfPathExt for PathResolver<R> {
    fn app_conf_file(&self) -> PathBuf {
        let path = self.app_config_dir().expect("[TauriApi] app_config_file");

        path.join(APP_CONFIG_FILE)
    }

    fn app_conf_backup_file(&self) -> PathBuf {
        let path = self.app_config_dir().expect("[TauriApi] app_conf_backup_file");

        let now = chrono::Local::now();
        let backup_filename = format!(
            "conf_{:04}_{:02}_{:02}_{:02}_{:02}_{:02}.json",
            now.year(),
            now.month(),
            now.day(),
            now.hour(),
            now.minute(),
            now.second()
        );

        path.join(backup_filename)
    }
}

impl<R: Runtime> GuidesPathExt for PathResolver<R> {
    fn app_guides_dir(&self) -> PathBuf {
        let path = self.app_config_dir().expect("[TauriApi] app_guides_dir");

        path.join(APP_GUIDES_DIR)
    }

    fn app_recent_guides_file(&self) -> PathBuf {
        let path = self
            .app_config_dir()
            .expect("[TauriApi] app_recent_guides_file");

        path.join(APP_RECENT_GUIDES_FILE)
    }
}

impl<R: Runtime> FirstTimePathExt for PathResolver<R> {
    fn app_first_time_start(&self) -> PathBuf {
        let path = self
            .app_config_dir()
            .expect("[TauriApi] app_first_time_start");

        path.join(APP_FIRST_TIME_START_FILE)
    }
}

impl<R: Runtime> ViewedNotificationsPathExt for PathResolver<R> {
    fn app_viewed_notifications_file(&self) -> PathBuf {
        let path = self
            .app_config_dir()
            .expect("[TauriApi] app_viewed_notifications_file");

        path.join(APP_VIEWED_NOTIFICATIONS_FILE)
    }
}

impl<R: Runtime> AuthPathExt for PathResolver<R> {
    fn app_auth_file(&self) -> PathBuf {
        let path = self.app_config_dir().expect("[TauriApi] app_auth_file");
        path.join(APP_AUTH_FILE)
    }
}
