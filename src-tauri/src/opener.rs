use std::path::Path;

use tauri::{AppHandle, Runtime};
use tauri_plugin_opener::OpenerExt;

pub async fn open_url<R: Runtime>(app: &AppHandle<R>, url: &str) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    if linux::open(url.to_string()).await.is_ok() {
        return Ok(());
    }

    app.opener()
        .open_url(url, None::<String>)
        .map_err(|err| err.to_string())
}

pub async fn open_path<R: Runtime>(app: &AppHandle<R>, path: &Path) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    if path.exists() && linux::open(path.as_os_str().to_owned()).await.is_ok() {
        return Ok(());
    }

    app.opener()
        .open_path(path.to_string_lossy(), None::<String>)
        .map_err(|err| err.to_string())
}

#[cfg(target_os = "linux")]
mod linux {
    use std::{
        env,
        ffi::{OsStr, OsString},
        io,
        process::{Command, Stdio},
        thread,
        time::{Duration, Instant},
    };

    use log::{debug, warn};

    const LAUNCHER_TIMEOUT: Duration = Duration::from_secs(3);
    const POLL_INTERVAL: Duration = Duration::from_millis(50);

    pub async fn open(target: impl Into<OsString>) -> io::Result<()> {
        let target = target.into();

        tauri::async_runtime::spawn_blocking(move || open_blocking(&target))
            .await
            .map_err(io::Error::other)?
    }

    fn open_blocking(target: &OsStr) -> io::Result<()> {
        let mut last_error = io::Error::new(io::ErrorKind::NotFound, "no launcher available");

        for mut command in open::commands(target) {
            sanitize_appimage_env(&mut command);

            match run_launcher(&mut command) {
                Ok(()) => {
                    debug!("[Opener] opened with {:?}", command.get_program());
                    return Ok(());
                }
                Err(err) => {
                    warn!("[Opener] {:?} failed: {err}", command.get_program());
                    last_error = err;
                }
            }
        }

        Err(last_error)
    }

    fn run_launcher(command: &mut Command) -> io::Result<()> {
        let mut child = command
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()?;
        let deadline = Instant::now() + LAUNCHER_TIMEOUT;

        loop {
            if let Some(status) = child.try_wait()? {
                return if status.success() {
                    Ok(())
                } else {
                    Err(io::Error::other(format!("exited with {status}")))
                };
            }

            if Instant::now() >= deadline {
                thread::spawn(move || child.wait());
                return Ok(());
            }

            thread::sleep(POLL_INTERVAL);
        }
    }

    // AppImage runtimes prepend bundled paths (LD_LIBRARY_PATH, GTK_PATH, XDG_DATA_DIRS...)
    // which break host launchers and browsers, so they are stripped from the child env.
    fn sanitize_appimage_env(command: &mut Command) {
        if env::var_os("APPIMAGE").is_none() {
            return;
        }

        let Some(appdir) = env::var("APPDIR").ok().filter(|dir| !dir.is_empty()) else {
            return;
        };

        for (key, value) in env::vars() {
            if !value.contains(&appdir) {
                continue;
            }

            let host_value = value
                .split(':')
                .filter(|entry| !entry.is_empty() && !entry.starts_with(&appdir))
                .collect::<Vec<_>>()
                .join(":");

            if host_value.is_empty() {
                command.env_remove(&key);
            } else {
                command.env(&key, host_value);
            }
        }
    }
}
