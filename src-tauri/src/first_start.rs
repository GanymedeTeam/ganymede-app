use crate::tauri_api_ext::FirstTimePathExt;
use tauri::{AppHandle, Manager, Runtime};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Failed to write first time start file: {0}")]
    Write(std::io::Error),
}

pub trait FirstStartExt {
    fn is_first_start(&self) -> Result<bool, Error>;
}

impl<R: Runtime> FirstStartExt for AppHandle<R> {
    fn is_first_start(&self) -> Result<bool, Error> {
        let resolver = self.path();

        let first_time_start = resolver.app_first_time_start();
        let exists = first_time_start.exists();
        let version = self.package_info().version.to_string();

        if !exists {
            std::fs::write(
                first_time_start,
                format!(r###"{{"version": "{version}"}}"###, version = version),
            )
            .map_err(Error::Write)?;
        }

        Ok(!exists)
    }
}
