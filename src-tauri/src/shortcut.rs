use std::str::FromStr;
use tauri::{App, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use thiserror::Error as ThisError;

use crate::conf::Conf;

#[derive(Debug, ThisError)]
pub enum Error {
    #[error("failed to register shortcut: {0}")]
    Register(tauri_plugin_global_shortcut::Error),
    #[error("failed to register plugin: {0}")]
    RegisterPlugin(tauri::Error),
}

pub fn handle_shortcuts(app: &App) -> Result<(), Error> {
    let reset_conf_shortcut = Shortcut::from_str("Alt+Shift+P").unwrap();

    app.handle()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    let state = event.state();

                    match state {
                        ShortcutState::Pressed => {
                            if shortcut == &reset_conf_shortcut {
                                Conf::default()
                                    .save(app.path())
                                    .expect("[Shortcut] failed to reset conf");
                                println!("[Shortcut] conf reset triggered");

                                let mut webview = app
                                    .get_webview_window("main")
                                    .expect("[Shortcut] failed to get webview window");

                                let url = webview.url().unwrap();

                                webview
                                    .navigate(url)
                                    .expect("[Shortcut] failed to reload webview");
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
        eprintln!("[Shortcut]: {:?}", err);
    } else {
        println!("[Shortcut] registered: {}", reset_conf_shortcut.to_string());
    }

    reset_register?;

    Ok(())
}
