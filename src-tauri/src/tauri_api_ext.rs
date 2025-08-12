use std::path::PathBuf;
use tauri::path::PathResolver;
use tauri::Runtime;

pub trait ConfPathExt {
    fn app_conf_file(&self) -> PathBuf;
}

pub trait GuidesPathExt {
    fn app_guides_dir(&self) -> PathBuf;
}

pub trait FirstTimePathExt {
    fn app_first_time_start(&self) -> PathBuf;
}

pub trait ViewedNotificationsPathExt {
    fn app_viewed_notifications_file(&self) -> PathBuf;
}

impl<R: Runtime> ConfPathExt for PathResolver<R> {
    fn app_conf_file(&self) -> PathBuf {
        let path = self.app_config_dir().expect("[TauriApi] app_config_file");

        path.join("conf.json")
    }
}

impl<R: Runtime> GuidesPathExt for PathResolver<R> {
    fn app_guides_dir(&self) -> PathBuf {
        let path = self.app_config_dir().expect("[TauriApi] app_guides_dir");

        path.join("guides")
    }
}

impl<R: Runtime> FirstTimePathExt for PathResolver<R> {
    fn app_first_time_start(&self) -> PathBuf {
        let path = self
            .app_config_dir()
            .expect("[TauriApi] app_first_time_start");

        path.join("first_time_start.json")
    }
}

impl<R: Runtime> ViewedNotificationsPathExt for PathResolver<R> {
    fn app_viewed_notifications_file(&self) -> PathBuf {
        let path = self
            .app_config_dir()
            .expect("[TauriApi] app_viewed_notifications_file");

        path.join("viewed_notifications.json")
    }
}
