use std::{collections::HashMap, fs};

use log::{debug, info};
use serde::Serialize;
use tauri::{AppHandle, Manager, Runtime};

use crate::tauri_api_ext::PinnedGuidesPathExt;

// Constants

pub const MAX_PINNED_PER_PROFILE: usize = 50;

// Enums

#[derive(Debug, Serialize, thiserror::Error, taurpc::specta::Type)]
#[specta(rename = "PinnedGuidesError")]
pub enum Error {
    #[error("failed to get pinned guides, file is malformed")]
    Malformed(#[from] crate::json::Error),
    #[error("failed to create pinned guides dir: {0}")]
    CreateDir(String),
    #[error("failed to get conf dir: {0}")]
    ConfDir(String),
    #[error("failed to serialize pinned guides")]
    SerializePinnedGuides(crate::json::Error),
    #[error("unhandled io error: {0}")]
    UnhandledIo(String),
    #[error("failed to save pinned guides: {0}")]
    SavePinnedGuides(String),
    #[error("pinned guides limit reached for profile")]
    LimitReached,
}

// Structs

#[derive(Debug)]
#[taurpc::ipc_type]
pub struct ProfilePinnedGuides {
    pub guides: Vec<u32>,
}

#[derive(Debug)]
#[taurpc::ipc_type]
pub struct PinnedGuides {
    pub profiles: HashMap<String, ProfilePinnedGuides>,
}

// Implementations

impl Default for ProfilePinnedGuides {
    fn default() -> Self {
        ProfilePinnedGuides { guides: Vec::new() }
    }
}

impl Default for PinnedGuides {
    fn default() -> Self {
        PinnedGuides {
            profiles: HashMap::new(),
        }
    }
}

// Public Functions

pub fn get_pinned_guides<R: Runtime>(app_handle: &AppHandle<R>) -> Result<PinnedGuides, Error> {
    let path = app_handle.path().app_pinned_guides_file();

    let file = fs::read_to_string(path);

    match file {
        Err(err) => match err.kind() {
            std::io::ErrorKind::NotFound => Ok(PinnedGuides::default()),
            _ => Err(Error::UnhandledIo(err.to_string())),
        },
        Ok(file) => {
            Ok(crate::json::from_str::<PinnedGuides>(file.as_str()).map_err(Error::Malformed)?)
        }
    }
}

pub fn save_pinned_guides<R: Runtime>(
    pinned: &PinnedGuides,
    app: &AppHandle<R>,
) -> Result<(), Error> {
    let path = app.path().app_pinned_guides_file();

    let json = crate::json::serialize_pretty(pinned).map_err(Error::SerializePinnedGuides)?;

    fs::write(path, json).map_err(|err| Error::SavePinnedGuides(err.to_string()))
}

pub fn ensure_pinned_guides_file(app_handle: &AppHandle) -> Result<(), Error> {
    let resolver = app_handle.path();
    let conf_dir = resolver
        .app_config_dir()
        .map_err(|err| Error::ConfDir(err.to_string()))?;

    if !conf_dir.exists() {
        fs::create_dir_all(conf_dir).map_err(|err| Error::CreateDir(err.to_string()))?;
    }

    let path = resolver.app_pinned_guides_file();

    info!("[PinnedGuides] path: {:?}", path);

    if !path.exists() {
        info!("[PinnedGuides] file does not exists, creating default one");

        let default = PinnedGuides::default();

        save_pinned_guides(&default, app_handle)?;
    }

    Ok(())
}

// Private Functions

fn pin_guide(
    pinned: &mut PinnedGuides,
    profile_id: String,
    guide_id: u32,
) -> Result<(), Error> {
    let entry = pinned
        .profiles
        .entry(profile_id)
        .or_insert_with(ProfilePinnedGuides::default);

    if entry.guides.contains(&guide_id) {
        return Ok(());
    }

    if entry.guides.len() >= MAX_PINNED_PER_PROFILE {
        return Err(Error::LimitReached);
    }

    entry.guides.push(guide_id);

    Ok(())
}

fn unpin_guide(pinned: &mut PinnedGuides, profile_id: String, guide_id: u32) {
    if let Some(entry) = pinned.profiles.get_mut(&profile_id) {
        entry.guides.retain(|id| *id != guide_id);
        if entry.guides.is_empty() {
            pinned.profiles.remove(&profile_id);
        }
    }
}

// TauRPC API

#[taurpc::procedures(path = "pinnedGuides", export_to = "../src/ipc/bindings.ts")]
pub trait PinnedGuidesApi {
    async fn get<R: Runtime>(app_handle: AppHandle<R>) -> Result<PinnedGuides, Error>;
    #[taurpc(alias = "pinGuide")]
    async fn pin_guide<R: Runtime>(
        app_handle: AppHandle<R>,
        profile_id: String,
        guide_id: u32,
    ) -> Result<(), Error>;
    #[taurpc(alias = "unpinGuide")]
    async fn unpin_guide<R: Runtime>(
        app_handle: AppHandle<R>,
        profile_id: String,
        guide_id: u32,
    ) -> Result<(), Error>;
}

#[derive(Clone)]
pub struct PinnedGuidesApiImpl;

#[taurpc::resolvers]
impl PinnedGuidesApi for PinnedGuidesApiImpl {
    async fn get<R: Runtime>(self, app: AppHandle<R>) -> Result<PinnedGuides, Error> {
        get_pinned_guides(&app)
    }

    async fn pin_guide<R: Runtime>(
        self,
        app: AppHandle<R>,
        profile_id: String,
        guide_id: u32,
    ) -> Result<(), Error> {
        debug!(
            "[PinnedGuides] pin_guide: profile_id: {}, guide_id: {}",
            profile_id, guide_id
        );

        let mut pinned = get_pinned_guides(&app)?;

        pin_guide(&mut pinned, profile_id, guide_id)?;

        save_pinned_guides(&pinned, &app)
    }

    async fn unpin_guide<R: Runtime>(
        self,
        app: AppHandle<R>,
        profile_id: String,
        guide_id: u32,
    ) -> Result<(), Error> {
        debug!(
            "[PinnedGuides] unpin_guide: profile_id: {}, guide_id: {}",
            profile_id, guide_id
        );

        let mut pinned = get_pinned_guides(&app)?;

        unpin_guide(&mut pinned, profile_id, guide_id);

        save_pinned_guides(&pinned, &app)
    }
}
