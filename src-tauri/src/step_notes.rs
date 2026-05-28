use std::{collections::HashMap, fs};

use log::{debug, info};
use serde::Serialize;
use tauri::{AppHandle, Manager, Runtime};

use crate::tauri_api_ext::StepNotesPathExt;

// Constants

pub const MAX_NOTE_LEN: usize = 1000;

// Enums

#[derive(Debug, Serialize, thiserror::Error, taurpc::specta::Type)]
#[specta(rename = "StepNotesError")]
pub enum Error {
    #[error("failed to get step notes, file is malformed")]
    Malformed(#[from] crate::json::Error),
    #[error("failed to create step notes dir: {0}")]
    CreateDir(String),
    #[error("failed to get conf dir: {0}")]
    ConfDir(String),
    #[error("failed to serialize step notes")]
    SerializeStepNotes(crate::json::Error),
    #[error("unhandled io error: {0}")]
    UnhandledIo(String),
    #[error("failed to save step notes: {0}")]
    SaveStepNotes(String),
}

// Structs

#[derive(Debug)]
#[taurpc::ipc_type]
pub struct GuideStepNotes {
    pub steps: HashMap<u32, String>,
}

#[derive(Debug)]
#[taurpc::ipc_type]
pub struct ProfileStepNotes {
    pub guides: HashMap<u32, GuideStepNotes>,
}

#[derive(Debug)]
#[taurpc::ipc_type]
pub struct StepNotes {
    pub profiles: HashMap<String, ProfileStepNotes>,
}

// Implementations

impl Default for GuideStepNotes {
    fn default() -> Self {
        GuideStepNotes {
            steps: HashMap::new(),
        }
    }
}

impl Default for ProfileStepNotes {
    fn default() -> Self {
        ProfileStepNotes {
            guides: HashMap::new(),
        }
    }
}

impl Default for StepNotes {
    fn default() -> Self {
        StepNotes {
            profiles: HashMap::new(),
        }
    }
}

// Public Functions

pub fn get_step_notes<R: Runtime>(app_handle: &AppHandle<R>) -> Result<StepNotes, Error> {
    let path = app_handle.path().app_step_notes_file();

    let file = fs::read_to_string(path);

    match file {
        Err(err) => match err.kind() {
            std::io::ErrorKind::NotFound => Ok(StepNotes::default()),
            _ => Err(Error::UnhandledIo(err.to_string())),
        },
        Ok(file) => {
            Ok(crate::json::from_str::<StepNotes>(file.as_str()).map_err(Error::Malformed)?)
        }
    }
}

pub fn save_step_notes<R: Runtime>(notes: &StepNotes, app: &AppHandle<R>) -> Result<(), Error> {
    let path = app.path().app_step_notes_file();

    let json = crate::json::serialize_pretty(notes).map_err(Error::SerializeStepNotes)?;

    fs::write(path, json).map_err(|err| Error::SaveStepNotes(err.to_string()))
}

pub fn ensure_step_notes_file(app_handle: &AppHandle) -> Result<(), Error> {
    let resolver = app_handle.path();
    let conf_dir = resolver
        .app_config_dir()
        .map_err(|err| Error::ConfDir(err.to_string()))?;

    if !conf_dir.exists() {
        fs::create_dir_all(conf_dir).map_err(|err| Error::CreateDir(err.to_string()))?;
    }

    let path = resolver.app_step_notes_file();

    info!("[StepNotes] path: {:?}", path);

    if !path.exists() {
        info!("[StepNotes] file does not exists, creating default one");

        let default_notes = StepNotes::default();

        save_step_notes(&default_notes, app_handle)?;
    }

    Ok(())
}

// Private Functions

fn upsert_note(
    notes: &mut StepNotes,
    profile_id: String,
    guide_id: u32,
    step_index: u32,
    note: Option<String>,
) {
    let trimmed = note
        .as_deref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.chars().take(MAX_NOTE_LEN).collect::<String>());

    match trimmed {
        Some(value) => {
            notes
                .profiles
                .entry(profile_id)
                .or_insert_with(ProfileStepNotes::default)
                .guides
                .entry(guide_id)
                .or_insert_with(GuideStepNotes::default)
                .steps
                .insert(step_index, value);
        }
        None => {
            if let Some(profile_entry) = notes.profiles.get_mut(&profile_id) {
                if let Some(guide_entry) = profile_entry.guides.get_mut(&guide_id) {
                    guide_entry.steps.remove(&step_index);
                    if guide_entry.steps.is_empty() {
                        profile_entry.guides.remove(&guide_id);
                    }
                }
                if profile_entry.guides.is_empty() {
                    notes.profiles.remove(&profile_id);
                }
            }
        }
    }
}

// TauRPC API

#[taurpc::procedures(path = "stepNotes", export_to = "../src/ipc/bindings.ts")]
pub trait StepNotesApi {
    async fn get<R: Runtime>(app_handle: AppHandle<R>) -> Result<StepNotes, Error>;
    #[taurpc(alias = "setStepNote")]
    async fn set_step_note<R: Runtime>(
        app_handle: AppHandle<R>,
        profile_id: String,
        guide_id: u32,
        step_index: u32,
        note: Option<String>,
    ) -> Result<(), Error>;
}

#[derive(Clone)]
pub struct StepNotesApiImpl;

#[taurpc::resolvers]
impl StepNotesApi for StepNotesApiImpl {
    async fn get<R: Runtime>(self, app: AppHandle<R>) -> Result<StepNotes, Error> {
        get_step_notes(&app)
    }

    async fn set_step_note<R: Runtime>(
        self,
        app: AppHandle<R>,
        profile_id: String,
        guide_id: u32,
        step_index: u32,
        note: Option<String>,
    ) -> Result<(), Error> {
        debug!(
            "[StepNotes] set_step_note: profile_id: {}, guide_id: {}, step_index: {}, has_note: {}",
            profile_id,
            guide_id,
            step_index,
            note.is_some()
        );

        let mut notes = get_step_notes(&app)?;

        upsert_note(&mut notes, profile_id, guide_id, step_index, note);

        save_step_notes(&notes, &app)
    }
}
