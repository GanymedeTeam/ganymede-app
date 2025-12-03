use log::{error, info};
use serde::Serialize;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use tauri::{App, AppHandle, Emitter, Manager, Runtime, State, Wry};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::conf::{backup_conf, get_conf, save_conf, Conf, Shortcuts};
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

fn parse_shortcut_or_default(value: &str, default: &str) -> Result<Shortcut, Error> {
    Shortcut::from_str(value)
        .or_else(|e| {
            error!("[Shortcut] invalid shortcut '{}': {:?}, using default '{}'", value, e, default);
            Shortcut::from_str(default)
        })
        .map_err(|e| Error::ParseShortcut(format!("failed to parse default '{}': {}", default, e)))
}

pub fn handle_shortcuts(app: &App) -> Result<(), Error> {
    let conf = get_conf(&app.handle())?;

    let reset_conf_shortcut = parse_shortcut_or_default(&conf.shortcuts.reset_conf, "Alt+Shift+P")?;
    let go_next_step_shortcut = parse_shortcut_or_default(&conf.shortcuts.go_next_step, "CommandOrControl+Shift+E")?;
    let go_previous_step_shortcut = parse_shortcut_or_default(&conf.shortcuts.go_previous_step, "CommandOrControl+Shift+A")?;
    let copy_current_step_shortcut = parse_shortcut_or_default(&conf.shortcuts.copy_current_step, "CommandOrControl+Shift+C")?;

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

                            let reset_conf_sc = Shortcut::from_str(&cached_shortcuts.reset_conf)
                                .or_else(|e| {
                                    error!("[Shortcut] invalid reset_conf: {:?}, using default", e);
                                    Shortcut::from_str("Alt+Shift+P")
                                });
                            let go_next_step_sc = Shortcut::from_str(&cached_shortcuts.go_next_step)
                                .or_else(|e| {
                                    error!("[Shortcut] invalid go_next_step: {:?}, using default", e);
                                    Shortcut::from_str("CommandOrControl+Shift+E")
                                });
                            let go_previous_step_sc = Shortcut::from_str(&cached_shortcuts.go_previous_step)
                                .or_else(|e| {
                                    error!("[Shortcut] invalid go_previous_step: {:?}, using default", e);
                                    Shortcut::from_str("CommandOrControl+Shift+A")
                                });
                            let copy_current_step_sc = Shortcut::from_str(&cached_shortcuts.copy_current_step)
                                .or_else(|e| {
                                    error!("[Shortcut] invalid copy_current_step: {:?}, using default", e);
                                    Shortcut::from_str("CommandOrControl+Shift+C")
                                });

                            drop(cached_shortcuts);

                            let (reset_conf_sc, go_next_step_sc, go_previous_step_sc, copy_current_step_sc) =
                                match (reset_conf_sc, go_next_step_sc, go_previous_step_sc, copy_current_step_sc) {
                                    (Ok(r), Ok(n), Ok(p), Ok(c)) => (r, n, p, c),
                                    _ => {
                                        error!("[Shortcut] failed to parse shortcuts, skipping event");
                                        return;
                                    }
                                };

                            if shortcut == &reset_conf_sc {
                                backup_conf(&app_handle)
                                    .expect("[Shortcut] failed to backup conf");
                                save_conf(&mut Conf::default(), &app_handle)
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
        parse_shortcut_or_default(&conf.shortcuts.reset_conf, "Alt+Shift+P")?,
        parse_shortcut_or_default(&conf.shortcuts.go_next_step, "CommandOrControl+Shift+E")?,
        parse_shortcut_or_default(&conf.shortcuts.go_previous_step, "CommandOrControl+Shift+A")?,
        parse_shortcut_or_default(&conf.shortcuts.copy_current_step, "CommandOrControl+Shift+C")?,
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
