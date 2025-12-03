use log::{error, info};
use serde::Serialize;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use tauri::{App, AppHandle, Emitter, Manager, Runtime, State, Wry};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::conf::{get_conf, Conf, Shortcuts};
use crate::event::Event;
use crate::guides::GuidesEventTrigger;

#[derive(Clone)]
pub struct ShortcutsCache(Arc<Mutex<Shortcuts>>);

#[derive(Debug, Serialize, thiserror::Error, taurpc::specta::Type)]
#[specta(rename = "ShortcutError")]
pub enum Error {
    #[error("failed to register shortcut: {0}")]
    Register(String),
    #[error("failed to register plugin: {0}")]
    RegisterPlugin(String),
    #[error("failed to parse shortcut: {0}")]
    ParseShortcut(String),
    #[error("failed to get conf: {0}")]
    GetConf(#[from] crate::conf::Error),
    #[error("failed to unregister shortcut: {0}")]
    Unregister(String),
}

pub fn handle_shortcuts(app: &App) -> Result<(), Error> {
    let conf = get_conf(&app.handle())?;

    let reset_conf_shortcut = Shortcut::from_str(&conf.shortcuts.reset_conf)
        .map_err(|e| Error::ParseShortcut(e.to_string()))?;
    let go_next_step_shortcut = Shortcut::from_str(&conf.shortcuts.go_next_step)
        .map_err(|e| Error::ParseShortcut(e.to_string()))?;
    let go_previous_step_shortcut = Shortcut::from_str(&conf.shortcuts.go_previous_step)
        .map_err(|e| Error::ParseShortcut(e.to_string()))?;
    let copy_current_step_shortcut = Shortcut::from_str(&conf.shortcuts.copy_current_step)
        .map_err(|e| Error::ParseShortcut(e.to_string()))?;

    let cache = ShortcutsCache(Arc::new(Mutex::new(conf.shortcuts.clone())));
    app.manage(cache.clone());

    app.handle()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app_handle, shortcut, event| {
                    let state = event.state();

                    #[cfg(not(debug_assertions))]
                    {
                        use tauri_plugin_sentry::sentry::{
                            add_breadcrumb, protocol::Map, Breadcrumb,
                        };

                        add_breadcrumb(Breadcrumb {
                            category: Some("sentry.transaction".into()),
                            data: {
                                let mut map = Map::new();

                                map.insert(
                                    "type".into(),
                                    match state {
                                        ShortcutState::Pressed => "pressed",
                                        ShortcutState::Released => "released",
                                    }
                                    .into(),
                                );

                                map.insert("shortcut".into(), shortcut.to_string().into());

                                map
                            },
                            ..Default::default()
                        });
                    }

                    match state {
                        ShortcutState::Pressed => {
                            let cache: State<ShortcutsCache> = app_handle.state();
                            let cached_shortcuts = cache.0.lock().unwrap();

                            let reset_conf_sc = match Shortcut::from_str(&cached_shortcuts.reset_conf) {
                                Ok(sc) => sc,
                                Err(e) => {
                                    error!("[Shortcut] failed to parse reset_conf: {:?}", e);
                                    return;
                                }
                            };

                            let go_next_step_sc = match Shortcut::from_str(&cached_shortcuts.go_next_step) {
                                Ok(sc) => sc,
                                Err(e) => {
                                    error!("[Shortcut] failed to parse go_next_step: {:?}", e);
                                    return;
                                }
                            };

                            let go_previous_step_sc = match Shortcut::from_str(&cached_shortcuts.go_previous_step) {
                                Ok(sc) => sc,
                                Err(e) => {
                                    error!("[Shortcut] failed to parse go_previous_step: {:?}", e);
                                    return;
                                }
                            };

                            let copy_current_step_sc = match Shortcut::from_str(&cached_shortcuts.copy_current_step) {
                                Ok(sc) => sc,
                                Err(e) => {
                                    error!("[Shortcut] failed to parse copy_current_step: {:?}", e);
                                    return;
                                }
                            };

                            drop(cached_shortcuts);

                            if shortcut == &reset_conf_sc {
                                crate::conf::save_conf(&mut Conf::default(), &app_handle)
                                    .expect("[Shortcut] failed to reset conf");
                                info!("[Shortcut] conf reset triggered");

                                let webview = app_handle
                                    .get_webview_window("main")
                                    .expect("[Shortcut] failed to get webview window");

                                let url = webview.url().unwrap();

                                webview
                                    .navigate(url)
                                    .expect("[Shortcut] failed to reload webview");
                            } else if shortcut == &go_next_step_sc {
                                info!("Shortcut {} pressed", shortcut.to_string());
                                app_handle.emit(Event::GoToNextGuideStep.into(), 0)
                                    .expect("[Shortcut] failed to emit next event");
                            } else if shortcut == &go_previous_step_sc {
                                info!("Shortcut {} pressed", shortcut.to_string());
                                app_handle.emit(Event::GoToPreviousGuideStep.into(), 0)
                                    .expect("[Shortcut] failed to emit previous event");
                            } else if shortcut == &copy_current_step_sc {
                                info!("Shortcut {} pressed", shortcut.to_string());

                                let trigger = GuidesEventTrigger::new(app_handle.clone());

                                trigger
                                    .copy_current_guide_step::<Wry>()
                                    .expect("[Shortcut] failed to copy current step");
                            }
                        }
                        _ => {}
                    }
                })
                .build(),
        )
        .map_err(|e| Error::RegisterPlugin(e.to_string()))?;

    let reset_register = app
        .global_shortcut()
        .register(reset_conf_shortcut)
        .map_err(|e| Error::Register(e.to_string()));

    if let Err(err) = &reset_register {
        error!("[Shortcut]: {:?}", err);
    } else {
        info!("[Shortcut] registered: {}", reset_conf_shortcut.to_string());
    }

    let go_next_step_register = app
        .global_shortcut()
        .register(go_next_step_shortcut)
        .map_err(|e| Error::Register(e.to_string()));

    if let Err(err) = &go_next_step_register {
        error!("[Shortcut]: {:?}", err);
    } else {
        info!(
            "[Shortcut] registered: {}",
            go_next_step_shortcut.to_string()
        );
    }

    let go_previous_step_register = app
        .global_shortcut()
        .register(go_previous_step_shortcut)
        .map_err(|e| Error::Register(e.to_string()));

    if let Err(err) = &go_previous_step_register {
        error!("[Shortcut]: {:?}", err);
    } else {
        info!(
            "[Shortcut] registered: {}",
            go_previous_step_shortcut.to_string()
        );
    }

    let copy_current_step_register = app
        .global_shortcut()
        .register(copy_current_step_shortcut)
        .map_err(|e| Error::Register(e.to_string()));

    if let Err(err) = &copy_current_step_register {
        error!("[Shortcut]: {:?}", err);
    } else {
        info!(
            "[Shortcut] registered: {}",
            copy_current_step_shortcut.to_string()
        );
    }

    reset_register
        .and(go_next_step_register)
        .and(go_previous_step_register)
        .and(copy_current_step_register)?;

    Ok(())
}

pub fn reregister_shortcuts<R: Runtime>(app: &AppHandle<R>) -> Result<(), Error> {
    let conf = get_conf(app)?;

    let cache: State<ShortcutsCache> = app.state();
    {
        let mut cached_shortcuts = cache.0.lock().unwrap();
        *cached_shortcuts = conf.shortcuts.clone();
    }

    let shortcuts = vec![
        Shortcut::from_str(&conf.shortcuts.reset_conf)
            .map_err(|e| Error::ParseShortcut(e.to_string()))?,
        Shortcut::from_str(&conf.shortcuts.go_next_step)
            .map_err(|e| Error::ParseShortcut(e.to_string()))?,
        Shortcut::from_str(&conf.shortcuts.go_previous_step)
            .map_err(|e| Error::ParseShortcut(e.to_string()))?,
        Shortcut::from_str(&conf.shortcuts.copy_current_step)
            .map_err(|e| Error::ParseShortcut(e.to_string()))?,
    ];

    app.global_shortcut()
        .unregister_all()
        .map_err(|e| Error::Unregister(e.to_string()))?;

    for shortcut in &shortcuts {
        let register_result = app.global_shortcut().register(*shortcut).map_err(|e| Error::Register(e.to_string()));

        if let Err(err) = &register_result {
            error!("[Shortcut]: {:?}", err);
        } else {
            info!("[Shortcut] registered: {}", shortcut.to_string());
        }

        register_result?;
    }

    Ok(())
}

#[taurpc::procedures(path = "shortcuts", export_to = "../src/ipc/bindings.ts")]
pub trait ShortcutsApi {
    async fn reregister<R: Runtime>(app_handle: AppHandle<R>) -> Result<(), Error>;
}

#[derive(Clone)]
pub struct ShortcutsApiImpl;

#[taurpc::resolvers]
impl ShortcutsApi for ShortcutsApiImpl {
    async fn reregister<R: Runtime>(self, app_handle: AppHandle<R>) -> Result<(), Error> {
        reregister_shortcuts(&app_handle)
    }
}
