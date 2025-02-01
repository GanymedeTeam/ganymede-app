use crate::tauri_api_ext::ConfPathExt;
use log::{debug, info};
use serde::{Deserialize, Serialize};
use std::borrow::BorrowMut;
use std::collections::HashMap;
use std::fs;
use tauri::{AppHandle, Manager, Window, Wry};

const DEFAULT_LEVEL: u32 = 200;

const fn default_level() -> u32 {
    DEFAULT_LEVEL
}

#[derive(Debug, Serialize, thiserror::Error)]
pub enum Error {
    #[error("failed to get conf, file is malformed")]
    Malformed(#[from] crate::json::Error),
    #[error("failed to create conf dir: {0}")]
    CreateConfDir(String),
    #[error("failed to get conf dir: {0}")]
    ConfDir(String),
    #[error("failed to serialize conf")]
    SerializeConf(crate::json::Error),
    #[error("unhandled io error: {0}")]
    UnhandledIo(String),
    #[error("failed to save conf: {0}")]
    SaveConf(String),
    #[error("failed to get profile in use")]
    GetProfileInUse,
    #[error("failed to reset conf: {0}")]
    ResetConf(Box<Error>),
}

#[derive(Serialize, Deserialize, Debug, Clone, taurpc::specta::Type)]
pub struct Profile {
    pub id: String,
    pub name: String,
    #[serde(default = "default_level")]
    pub level: u32,
    pub progresses: Vec<Progress>,
}

#[derive(Serialize, Deserialize, Debug, Clone, taurpc::specta::Type)]
pub struct ConfStep {
    pub checkboxes: Vec<u32>,
}

#[derive(Serialize, Deserialize, Debug, Clone, taurpc::specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Progress {
    pub id: u32, // guide id
    pub current_step: u32,
    pub steps: HashMap<u32, ConfStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize, taurpc::specta::Type)]
pub enum ConfLang {
    En,
    Fr,
    Es,
    Pt,
}

#[derive(Debug, Clone, Serialize, Deserialize, taurpc::specta::Type)]
pub enum FontSize {
    ExtraSmall,
    Small,
    Normal,
    Large,
    ExtraLarge,
}

#[derive(Serialize, Deserialize, Debug, Clone, taurpc::specta::Type)]
pub struct AutoPilot {
    pub name: String,
    pub position: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, taurpc::specta::Type)]
pub struct Note {
    pub name: String,
    pub text: String,
}

#[derive(Debug)]
#[taurpc::ipc_type]
#[serde(rename_all = "camelCase")]
pub struct Conf {
    pub auto_travel_copy: bool,
    pub show_done_guides: bool,
    #[serde(default)]
    pub lang: ConfLang,
    #[serde(default)]
    pub font_size: FontSize,
    pub profiles: Vec<Profile>,
    pub profile_in_use: String,
    pub auto_pilots: Vec<AutoPilot>,
    pub notes: Vec<Note>,
    pub opacity: f32,
}

impl Progress {
    pub fn add_or_update_step(&mut self, step: ConfStep, step_index: u32) {
        match self.steps.get(&step_index) {
            Some(s) => {
                self.steps.insert(step_index, s.clone());
            }
            None => {
                self.steps.insert(step_index, step.clone());
            }
        }
    }

    pub fn new(id: u32) -> Self {
        Progress {
            id,
            current_step: 0,
            steps: HashMap::new(),
        }
    }
}

impl Profile {
    pub fn get_progress_mut(&mut self, guide_id: u32) -> &mut Progress {
        if let Some(index) = self.progresses.iter().position(|p| p.id == guide_id) {
            return &mut self.progresses[index];
        }

        // If no Progress is found, we create a new one
        self.progresses.push(Progress::new(guide_id));

        // We return a mutable reference to the newly created Progress
        self.progresses
            .last_mut()
            .expect("[Conf] the element has just been added, it should exist.")
    }
}

impl ConfStep {
    pub fn toggle_checkbox(&mut self, checkbox_index: u32) {
        match self.checkboxes.iter().position(|&i| i == checkbox_index) {
            Some(index) => {
                self.checkboxes.remove(index);
            }
            None => {
                self.checkboxes.push(checkbox_index);
            }
        }
    }
}

impl Conf {
    /// Get the conf file content, if it does not exist, return default conf
    pub fn get(app: &AppHandle) -> Result<Conf, Error> {
        let conf_path = app.path().app_conf_file();

        let file = fs::read_to_string(conf_path);

        // if conf file does not exist, return default conf, otherwise parse the file content
        match file {
            Err(err) => match err.kind() {
                std::io::ErrorKind::NotFound => Ok(Conf::default()),
                _ => Err(Error::UnhandledIo(err.to_string())),
            },
            Ok(file) => Ok(crate::json::from_str::<Conf>(file.as_str()).map_err(Error::Malformed)?),
        }
    }

    /// Save the conf into the conf file. Normalize the conf before saving it
    pub fn save(&mut self, app: &AppHandle) -> Result<(), Error> {
        let conf_path = app.path().app_conf_file();

        self.normalize();

        let json = crate::json::serialize_pretty(self).map_err(Error::SerializeConf)?;

        fs::write(conf_path, json).map_err(|err| Error::SaveConf(err.to_string()))
    }

    pub fn get_profile_in_use_mut(&mut self) -> Result<&mut Profile, Error> {
        self.profiles
            .iter_mut()
            .find(|p| p.id == self.profile_in_use)
            .ok_or(Error::GetProfileInUse)
    }

    pub fn normalize(&mut self) {
        self.opacity = self.opacity.clamp(0.0, 0.98);
    }
}

impl Default for ConfStep {
    fn default() -> Self {
        ConfStep { checkboxes: vec![] }
    }
}

impl Default for ConfLang {
    fn default() -> Self {
        ConfLang::Fr
    }
}

impl Default for FontSize {
    fn default() -> Self {
        FontSize::Normal
    }
}

impl Default for Conf {
    fn default() -> Self {
        let default_profile = Profile::default();
        let default_profile_id = default_profile.id.clone();

        Conf {
            auto_travel_copy: true,
            show_done_guides: true,
            lang: ConfLang::default(),
            font_size: FontSize::default(),
            profiles: vec![default_profile],
            profile_in_use: default_profile_id,
            auto_pilots: vec![],
            notes: vec![],
            opacity: 0.98,
        }
    }
}

impl Default for Profile {
    fn default() -> Self {
        Profile {
            id: uuid::Uuid::new_v4().to_string(),
            name: "Player".to_string(),
            level: 200,
            progresses: vec![],
        }
    }
}

/// Ensure that the conf file exists, if not, create it with default values
pub fn ensure(app: &AppHandle) -> Result<(), Error> {
    let resolver = app.path();
    let conf_dir = resolver
        .app_config_dir()
        .map_err(|err| Error::ConfDir(err.to_string()))?;

    if !conf_dir.exists() {
        fs::create_dir_all(conf_dir).map_err(|err| Error::CreateConfDir(err.to_string()))?;
    }

    let conf_path = resolver.app_conf_file();

    info!("[Conf] path: {:?}", conf_path);

    if !conf_path.exists() {
        info!("[Conf] file does not exists, creating default one");

        let default_conf = &mut Conf::default();

        default_conf.save(app)?;
    }

    Ok(())
}

#[taurpc::procedures(path = "conf", export_to = "../src/ipc/bindings.ts")]
pub trait ConfApi {
    async fn get(app_handle: AppHandle) -> Result<Conf, Error>;
    async fn set(conf: Conf, app_handle: AppHandle) -> Result<(), Error>;
    #[taurpc(alias = "toggleGuideCheckbox")]
    async fn toggle_guide_checkbox(
        app_handle: AppHandle,
        guide_id: u32,
        step_index: u32,
        checkbox_index: u32,
    ) -> Result<u32, Error>;
    async fn reset(app_handle: AppHandle, window: Window) -> Result<(), Error>;
}

#[derive(Clone)]
pub struct ConfApiImpl;

#[taurpc::resolvers]
impl ConfApi for ConfApiImpl {
    async fn get(self, app: AppHandle) -> Result<Conf, Error> {
        Conf::get(&app)
    }

    async fn set(self, conf: Conf, app: AppHandle) -> Result<(), Error> {
        conf.clone().borrow_mut().save(&app)
    }

    async fn toggle_guide_checkbox(
        self,
        app: AppHandle,
        guide_id: u32,
        step_index: u32,
        checkbox_index: u32,
    ) -> Result<u32, Error> {
        debug!(
            "[Conf] toggle_guide_checkbox: guide_id: {}, step_index: {}, checkbox_index: {}",
            guide_id, step_index, checkbox_index
        );
        let conf = &mut Conf::get(&app)?;
        let profile = conf.get_profile_in_use_mut()?;
        let progress = profile.get_progress_mut(guide_id);

        let step = match progress.steps.get_mut(&step_index) {
            Some(step) => {
                step.toggle_checkbox(checkbox_index);

                step.clone()
            }
            None => {
                let mut step = ConfStep::default();
                step.toggle_checkbox(checkbox_index);

                step
            }
        };

        progress.add_or_update_step(step, step_index);

        conf.save(&app)?;

        Ok(checkbox_index)
    }

    async fn reset(self, app: AppHandle, window: Window<Wry>) -> Result<(), Error> {
        Conf::default()
            .save(&app)
            .map_err(|e| Error::ResetConf(Box::new(e)))?;

        let mut webview = window
            .get_webview_window("main")
            .expect("[Conf] main webview should exist");

        let url = webview.url().unwrap();

        webview
            .navigate(url)
            .expect("[Conf] failed to reload webview");

        Ok(())
    }
}
