use crate::tauri_api_ext::ConfPathExt;
use serde::{Deserialize, Serialize};
use std::borrow::BorrowMut;
use std::collections::HashMap;
use std::fs;
use tauri::path::PathResolver;
use tauri::{Manager, Runtime, Window, Wry};

#[derive(Debug)]
pub enum Error {
    Malformed(crate::json::Error),
    CreateConfDir(std::io::Error),
    ConfDir(tauri::Error),
    SerializeConf(serde_json::Error),
    UnhandledIo(std::io::Error),
    SaveConf(std::io::Error),
    GetProfileInUse,
    ResetConf(Box<Error>),
}

impl Into<tauri::ipc::InvokeError> for Error {
    fn into(self) -> tauri::ipc::InvokeError {
        match self {
            Error::Malformed(err) => tauri::ipc::InvokeError::from(err.to_string()),
            Error::CreateConfDir(err) => tauri::ipc::InvokeError::from(err.to_string()),
            Error::ConfDir(err) => tauri::ipc::InvokeError::from(err.to_string()),
            Error::SerializeConf(err) => tauri::ipc::InvokeError::from(err.to_string()),
            Error::UnhandledIo(err) => tauri::ipc::InvokeError::from(err.to_string()),
            Error::SaveConf(err) => tauri::ipc::InvokeError::from(err.to_string()),
            Error::GetProfileInUse => tauri::ipc::InvokeError::from("GetProfileInUse".to_string()),
            Error::ResetConf(err) => (*err).into(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub progresses: Vec<Progress>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Step {
    pub checkboxes: Vec<usize>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Progress {
    pub id: u32, // guide id
    pub current_step: usize,
    pub steps: HashMap<usize, Step>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Lang {
    En,
    Fr,
    Es,
    Pt,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FontSize {
    ExtraSmall,
    Small,
    Normal,
    Large,
    ExtraLarge,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AutoPilot {
    pub name: String,
    pub position: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Note {
    pub name: String,
    pub text: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Conf {
    pub auto_travel_copy: bool,
    pub show_done_guides: bool,
    #[serde(default)]
    pub lang: Lang,
    #[serde(default)]
    pub font_size: FontSize,
    pub profiles: Vec<Profile>,
    pub profile_in_use: String,
    pub auto_pilots: Vec<AutoPilot>,
    pub notes: Vec<Note>,
    pub opacity: f32,
}

impl Progress {
    pub fn add_or_update_step(&mut self, step: Step, step_index: usize) {
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

impl Step {
    pub fn toggle_checkbox(&mut self, checkbox_index: usize) {
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
    pub fn get_with_resolver<R: Runtime>(resolver: &PathResolver<R>) -> Result<Conf, Error> {
        let conf_path = resolver.app_conf_file();

        let file = fs::read_to_string(conf_path);

        // if conf file does not exist, return default conf, otherwise parse the file content
        match file {
            Err(err) => match err.kind() {
                std::io::ErrorKind::NotFound => Ok(Conf::default()),
                _ => Err(Error::UnhandledIo(err)),
            },
            Ok(file) => Ok(crate::json::from_str::<Conf>(file.as_str()).map_err(Error::Malformed)?),
        }
    }

    /// Save the conf into the conf file. Normalize the conf before saving it
    pub fn save<R: Runtime>(&mut self, resolver: &PathResolver<R>) -> Result<(), Error> {
        let conf_path = resolver.app_conf_file();

        self.normalize();

        let json = serde_json::to_string_pretty(self).map_err(Error::SerializeConf)?;

        fs::write(conf_path, json).map_err(Error::SaveConf)
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

impl Default for Step {
    fn default() -> Self {
        Step { checkboxes: vec![] }
    }
}

impl Default for Lang {
    fn default() -> Self {
        Lang::Fr
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
            lang: Lang::default(),
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
            progresses: vec![],
        }
    }
}

/// Ensure that the conf file exists, if not, create it with default values
pub fn ensure_with_resolver<R: Runtime>(resolver: &PathResolver<R>) -> Result<(), Error> {
    let conf_dir = resolver.app_config_dir().map_err(Error::ConfDir)?;

    if !conf_dir.exists() {
        fs::create_dir_all(conf_dir).map_err(Error::CreateConfDir)?;
    }

    let conf_path = resolver.app_conf_file();

    println!("[Conf] path: {:?}", conf_path);

    if !conf_path.exists() {
        println!("[Conf] file does not exists, creating default one");

        let default_conf = &mut Conf::default();

        default_conf.save(resolver)?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_conf(window: Window<Wry>) -> Result<Conf, Error> {
    Conf::get_with_resolver(window.path())
}

#[tauri::command]
pub fn set_conf(conf: Conf, window: Window<Wry>) -> Result<(), Error> {
    let resolver = window.path();

    conf.clone().borrow_mut().save(resolver)
}

#[tauri::command]
pub fn toggle_guide_checkbox(
    window: Window<Wry>,
    guide_id: u32,
    step_index: usize,
    checkbox_index: usize,
) -> Result<usize, Error> {
    let resolver = window.path();
    let conf = &mut Conf::get_with_resolver(resolver)?;
    let profile = conf.get_profile_in_use_mut()?;
    let progress = profile.get_progress_mut(guide_id);

    let step = match progress.steps.get_mut(&step_index) {
        Some(step) => {
            step.toggle_checkbox(checkbox_index);

            step.clone()
        }
        None => {
            let mut step = Step::default();
            step.toggle_checkbox(checkbox_index);

            step
        }
    };

    progress.add_or_update_step(step, step_index);

    conf.save(resolver)?;

    Ok(checkbox_index)
}

#[tauri::command]
pub fn reset_conf(window: Window<Wry>) -> Result<(), Error> {
    Conf::default()
        .save(window.path())
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
