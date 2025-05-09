use log::{error, info};
use std::str::FromStr;
use tauri::{App, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use tauri_plugin_sentry::sentry;
use thiserror::Error as ThisError;

use crate::conf::Conf;
use crate::event::Event;
use crate::guides::GuidesEventTrigger;

#[derive(Debug, ThisError)]
pub enum Error {
    #[error("failed to register shortcut: {0}")]
    Register(tauri_plugin_global_shortcut::Error),
    #[error("failed to register plugin: {0}")]
    RegisterPlugin(tauri::Error),
}

pub fn handle_shortcuts(app: &App) -> Result<(), Error> {
    let reset_conf_shortcut = Shortcut::from_str("Alt+Shift+P").unwrap();
    let go_next_step_shortcut = Shortcut::from_str("CommandOrControl+Shift+E").unwrap();
    let go_previous_step_shortcut = Shortcut::from_str("CommandOrControl+Shift+A").unwrap();
    let copy_current_step_shortcut = Shortcut::from_str("CommandOrControl+Shift+C").unwrap();

    app.handle()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    let state = event.state();

                    sentry::add_breadcrumb(sentry::Breadcrumb {
                        category: Some("sentry.transaction".into()),
                        data: {
                            let mut map = sentry::protocol::Map::new();

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

                    match state {
                        ShortcutState::Pressed => {
                            if shortcut == &reset_conf_shortcut {
                                Conf::default()
                                    .save(app)
                                    .expect("[Shortcut] failed to reset conf");
                                info!("[Shortcut] conf reset triggered");

                                let webview = app
                                    .get_webview_window("main")
                                    .expect("[Shortcut] failed to get webview window");

                                let url = webview.url().unwrap();

                                webview
                                    .navigate(url)
                                    .expect("[Shortcut] failed to reload webview");
                            }

                            if shortcut == &go_next_step_shortcut
                                || shortcut == &go_previous_step_shortcut
                            {
                                info!("Shortcut {} pressed", shortcut.to_string());

                                if shortcut == &go_next_step_shortcut {
                                    app.emit(Event::GoToNextGuideStep.into(), 0)
                                        .expect("[Shortcut] failed to emit next event");
                                } else if shortcut == &go_previous_step_shortcut {
                                    app.emit(Event::GoToPreviousGuideStep.into(), 0)
                                        .expect("[Shortcut] failed to emit previous event");
                                }
                            }

                            if shortcut == &copy_current_step_shortcut {
                                info!("Shortcut {} pressed", shortcut.to_string());

                                let trigger = GuidesEventTrigger::new(app.clone());

                                trigger
                                    .copy_current_guide_step()
                                    .expect("[Shortcut] failed to copy current step");
                            }
                        }
                        _ => {}
                    }
                })
                .build(),
        )
        .map_err(Error::RegisterPlugin)?;

    let reset_register = app
        .global_shortcut()
        .register(reset_conf_shortcut)
        .map_err(Error::Register);

    if let Err(err) = &reset_register {
        error!("[Shortcut]: {:?}", err);
    } else {
        info!("[Shortcut] registered: {}", reset_conf_shortcut.to_string());
    }

    let go_next_step_register = app
        .global_shortcut()
        .register(go_next_step_shortcut)
        .map_err(Error::Register);

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
        .map_err(Error::Register);

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
        .map_err(Error::Register);

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
