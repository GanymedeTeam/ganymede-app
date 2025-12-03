use crate::almanax::{AlmanaxApi, AlmanaxApiImpl};
use crate::api::{Api, ApiImpl};
use crate::base::{BaseApi, BaseApiImpl};
use crate::conf::{ConfApi, ConfApiImpl};
use crate::deep_link::{DeepLinkApi, DeepLinkApiImpl};
use crate::first_start::handle_first_start_setup;
use crate::guides::{GuidesApi, GuidesApiImpl};
use crate::image::{ImageApi, ImageApiImpl};
use crate::image_viewer::{ImageViewerApi, ImageViewerApiImpl};
use crate::notifications::{NotificationApi, NotificationApiImpl};
use crate::oauth::{OAuthApi, OAuthApiImpl};
use crate::security::{SecurityApi, SecurityApiImpl};
use crate::shortcut::{handle_shortcuts, ShortcutsApi, ShortcutsApiImpl};
use crate::update::{UpdateApi, UpdateApiImpl};
use crate::user::{UserApi, UserApiImpl};
use crate::window_manager::WindowManager;
use log::{error, info, LevelFilter};
use report::{ReportApi, ReportApiImpl};
use tauri::Manager;
use tauri_plugin_http::reqwest;
use tauri_plugin_log::{Target, TargetKind};
use taurpc::Router;

mod almanax;
#[cfg(not(dev))]
mod analytics;
mod api;
mod base;
mod conf;
mod deep_link;
mod event;
mod first_start;
mod guides;
mod image;
mod image_viewer;
mod item;
mod json;
mod notifications;
mod oauth;
mod quest;
mod report;
mod security;
mod shortcut;
mod tauri_api_ext;
mod update;
mod user;
mod window_manager;

#[cfg(dev)]
const LOG_TARGETS: [Target; 2] = [
    Target::new(TargetKind::Stdout),
    Target::new(TargetKind::Webview),
];

#[cfg(not(dev))]
const LOG_TARGETS: [Target; 2] = [
    Target::new(TargetKind::Stdout),
    Target::new(TargetKind::LogDir { file_name: None }),
];

fn formatter(file: &std::path::Path) -> std::io::Result<()> {
    std::process::Command::new("pnpm")
        .arg("biome")
        .arg("format")
        .arg(file)
        .output()
        .map(|_| ())
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
}

// Asserts that the formatter function matches the expected signature
const _: specta_typescript::FormatterFn = formatter;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(not(debug_assertions))]
    use tauri_plugin_sentry::{
        init_with_no_injection, minidump,
        sentry::{add_breadcrumb, capture_error, init, release_name, Breadcrumb, ClientOptions},
    };

    #[cfg(not(debug_assertions))]
    let sentry_client = init((
        env!("SENTRY_DSN"),
        ClientOptions {
            release: release_name!(),
            attach_stacktrace: true,
            ..Default::default()
        },
    ));

    #[cfg(not(debug_assertions))]
    let _guard = minidump::init(&sentry_client);

    let level_filter = if cfg!(debug_assertions) {
        LevelFilter::Debug
    } else {
        LevelFilter::Info
    };

    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
          info!("a new app instance was opened with {argv:?} and the deep link event was already triggered");
          // when defining deep link schemes at runtime, you must also check `argv` here
        }));
    }

    let app = builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_window_state::Builder::new().with_filter(|label| {
            // only keep main window state
            label == "main"
        }).build())
        .plugin({
            let log_builder = tauri_plugin_log::Builder::new()
                .clear_targets()
                .targets(LOG_TARGETS)
                .level(level_filter)
                .max_file_size(524_288)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
                .level_for("tauri", LevelFilter::Info);

            #[cfg(dev)]
            let log_builder = log_builder
                .level_for("html5ever", LevelFilter::Off)
                .level_for("selectors", LevelFilter::Off);

            log_builder.build()
        });

    #[cfg(not(debug_assertions))]
    let app = app.plugin(init_with_no_injection(&sentry_client));

    let router = Router::new()
        .export_config(
            specta_typescript::Typescript::default()
                .formatter(formatter)
                .header("// @ts-nocheck\n/** biome-ignore */\n"),
        )
        .merge(BaseApiImpl.into_handler())
        .merge(AlmanaxApiImpl.into_handler())
        .merge(GuidesApiImpl.into_handler())
        .merge(ApiImpl.into_handler())
        .merge(SecurityApiImpl.into_handler())
        .merge(ImageApiImpl.into_handler())
        .merge(ImageViewerApiImpl.into_handler())
        .merge(UpdateApiImpl.into_handler())
        .merge(ConfApiImpl.into_handler())
        .merge(ReportApiImpl.into_handler())
        .merge(DeepLinkApiImpl.into_handler())
        .merge(NotificationApiImpl.into_handler())
        .merge(OAuthApiImpl.into_handler())
        .merge(UserApiImpl.into_handler())
        .merge(ShortcutsApiImpl.into_handler());

    #[cfg(not(debug_assertions))]
    add_breadcrumb(Breadcrumb {
        category: Some("sentry.transaction".into()),
        message: Some("app plugins initialized".into()),
        ..Default::default()
    });

    app.setup(|app| {
        let http_client = reqwest::Client::builder()
            .user_agent("GANYMEDE_TAURI_APP")
            .build()
            .map_err(|err| crate::api::Error::BuildClientBuilder(err.to_string()))
            .unwrap();

        app.manage(http_client.clone());
        app.manage(WindowManager::new());

        #[cfg(not(debug_assertions))]
        add_breadcrumb(Breadcrumb {
            category: Some("sentry.transaction".into()),
            message: Some("app setup".into()),
            ..Default::default()
        });

        if let Err(err) = crate::conf::ensure_conf_file(app.handle()) {
            error!("[Lib] failed to ensure conf: {:?}", err);
            #[cfg(not(debug_assertions))]
            capture_error(&err);
        }

        if let Err(err) = crate::guides::ensure_guides_dir(app.handle()) {
            error!("[Lib] failed to ensure guides: {:?}", err);
            #[cfg(not(debug_assertions))]
            capture_error(&err);
        }

        handle_first_start_setup(app.handle().clone());

        #[cfg(not(dev))]
        crate::analytics::increment_download_count(app.handle(), http_client);

        #[cfg(desktop)]
        {
            // we do not want to crash the app if some shortcuts are not registered
            if let Err(err) = handle_shortcuts(app) {
                error!("[Lib] failed to handle shortcuts: {:?}", err);
                #[cfg(not(debug_assertions))]
                capture_error(&err);
            }
        }

        #[cfg(any(windows, target_os = "linux"))]
        {
            use tauri_plugin_deep_link::DeepLinkExt;

            app.deep_link().register_all()?;
        }

        // Setup deep link handler
        {
            use tauri_plugin_deep_link::DeepLinkExt;
            let app_handle = app.handle().clone();

            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    info!("[Lib] Deep link received: {}", url);

                    if let Err(err) = crate::deep_link::handle_deep_link_url(app_handle.clone(), url.as_str()) {
                        error!("[Lib] Failed to handle deep link URL immediately, storing for later: {:?}", err);
                        #[cfg(not(debug_assertions))]
                        capture_error(&err);
                    }
                }
            });
        }

        Ok(())
    })
    .invoke_handler(router.into_handler())
    .run(tauri::generate_context!())
    .expect("[Lib] error while running tauri application");
}
