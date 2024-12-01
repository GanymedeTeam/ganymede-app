use crate::api::GANYMEDE_API_V2;
use crate::tauri_api_ext::GuidesPathExt;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::{fmt, fs};
use tauri::{AppHandle, Manager, Window, Wry};
use tauri_plugin_http::reqwest;
use tauri_plugin_shell::ShellExt;

pub const DEFAULT_GUIDE_ID: u32 = 1074;

#[derive(Debug)]
pub enum Error {
    /// Error while parsing a glob pattern.
    Pattern(glob::PatternError),
    /// Error while reading the guides directory.
    ReadGuidesDir(glob::GlobError),
    /// Error while reading a guide file.
    ReadGuideFile(std::io::Error),
    /// Error while parsing a guide.
    GuideMalformed(crate::json::Error),
    /// Error while serializing a guide.
    SerializeGuide(serde_json::Error),
    /// Error while creating the guides directory.
    CreateGuidesDir(std::io::Error),
    /// Error while writing a guide file.
    WriteGuideFile(std::io::Error),
    /// Error while requesting a guide from the server.
    RequestGuide(reqwest::Error),
    /// Error while getting the content of a guide request.
    RequestGuideContent(reqwest::Error),
    /// Error while requesting guides from the server.
    RequestGuides(reqwest::Error),
    /// Error while getting the content of a guides request.
    RequestGuidesContent(reqwest::Error),
    /// Error while parsing a guide with steps.
    GuideWithStepsMalformed(crate::json::Error),
    /// Error while parsing guides.
    GuidesMalformed(crate::json::Error),
}

impl Into<tauri::ipc::InvokeError> for Error {
    fn into(self) -> tauri::ipc::InvokeError {
        match self {
            Error::Pattern(err) => {
                tauri::ipc::InvokeError::from(format!("Pattern({})", err.to_string()))
            }
            Error::ReadGuidesDir(err) => {
                tauri::ipc::InvokeError::from(format!("ReadGuidesDir({})", err.to_string()))
            }
            Error::ReadGuideFile(err) => {
                tauri::ipc::InvokeError::from(format!("ReadGuideFile({})", err.to_string()))
            }
            Error::GuideMalformed(err) => {
                tauri::ipc::InvokeError::from(format!("GuideMalformed({})", err.to_string()))
            }
            Error::SerializeGuide(err) => {
                tauri::ipc::InvokeError::from(format!("SerializeGuide({})", err.to_string()))
            }
            Error::CreateGuidesDir(err) => {
                tauri::ipc::InvokeError::from(format!("CreateGuidesDir({})", err.to_string()))
            }
            Error::WriteGuideFile(err) => {
                tauri::ipc::InvokeError::from(format!("WriteGuideFile({})", err.to_string()))
            }
            Error::RequestGuide(err) => {
                tauri::ipc::InvokeError::from(format!("RequestGuide({})", err.to_string()))
            }
            Error::RequestGuideContent(err) => {
                tauri::ipc::InvokeError::from(format!("RequestGuideContent({})", err.to_string()))
            }
            Error::RequestGuides(err) => {
                tauri::ipc::InvokeError::from(format!("RequestGuides({})", err.to_string()))
            }
            Error::RequestGuidesContent(err) => {
                tauri::ipc::InvokeError::from(format!("RequestGuidesContent({})", err.to_string()))
            }
            Error::GuideWithStepsMalformed(err) => tauri::ipc::InvokeError::from(format!(
                "GuideWithStepsMalformed({})",
                err.to_string()
            )),
            Error::GuidesMalformed(err) => {
                tauri::ipc::InvokeError::from(format!("GuidesMalformed({})", err.to_string()))
            }
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct User {
    pub id: u32,
    pub name: String,
    pub is_admin: u8,
    pub is_certified: u8,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum Lang {
    En,
    Fr,
    Es,
    Pt,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum Status {
    Draft,
    Public,
    Private,
    Certified,
    Gp,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Step {
    pub name: Option<String>,
    pub map: Option<String>,
    pub pos_x: i32,
    pub pos_y: i32,
    pub web_text: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Guide {
    pub id: u32,
    pub name: String,
    pub status: Status,
    pub likes: u32,
    pub dislikes: u32,
    pub downloads: Option<u32>,
    pub created_at: String,
    pub deleted_at: Option<String>,
    pub updated_at: Option<String>,
    pub lang: Lang,
    pub order: u32,
    pub user: User,
    pub user_id: u32,
    pub description: Option<String>,
    pub web_description: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct GuideWithSteps {
    pub id: u32,
    pub name: String,
    pub description: Option<String>,
    pub status: Status,
    pub likes: u32,
    pub dislikes: u32,
    pub downloads: Option<u32>,
    pub deleted_at: Option<String>,
    pub updated_at: Option<String>,
    pub lang: Lang,
    pub order: u32,
    pub user: User,
    pub web_description: Option<String>,
    pub steps: Vec<Step>,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct Guides {
    pub guides: Vec<GuideWithSteps>,
}

impl fmt::Display for Status {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let status_str = match self {
            Status::Draft => "draft",
            Status::Public => "public",
            Status::Private => "private",
            Status::Certified => "certified",
            Status::Gp => "gp",
        };
        write!(formatter, "{}", status_str)
    }
}

impl Guides {
    pub fn from_path(path_buf: &PathBuf) -> Result<Guides, Error> {
        println!("[Guides] get_guides in {:?}", path_buf);

        let options = glob::MatchOptions {
            case_sensitive: false,
            require_literal_separator: false,
            require_literal_leading_dot: false,
        };

        let files = glob::glob_with(path_buf.join("**/*.json").to_str().unwrap(), options)
            .map_err(Error::Pattern)?;

        let mut guides = vec![];

        for entry in files {
            let file = entry.map_err(Error::ReadGuidesDir)?;

            let file = fs::read_to_string(file.to_str().unwrap()).map_err(Error::ReadGuideFile)?;

            let guide = crate::json::from_str::<GuideWithSteps>(file.as_str())
                .map_err(Error::GuideMalformed)?;

            guides.push(guide);
        }

        Ok(Guides { guides })
    }

    pub fn from_handle(app: &AppHandle) -> Result<Guides, Error> {
        let guides_dir = &app.path().app_guides_dir();

        Guides::from_path(guides_dir)
    }

    pub fn save(&self, app: &AppHandle) -> Result<(), Error> {
        let guides_dir = &app.path().app_guides_dir();

        for guide in &self.guides {
            let json = serde_json::to_string_pretty(guide).map_err(Error::SerializeGuide)?;

            // Create the status directory if it doesn't exist
            let file = guides_dir
                .join(guide.status.to_string())
                .join(format!("{}.json", guide.id));

            if !file.exists() {
                fs::create_dir_all(file.parent().unwrap()).map_err(Error::CreateGuidesDir)?;
            }

            fs::write(file, json).map_err(Error::WriteGuideFile)?;
        }

        Ok(())
    }
}

pub fn ensure(app: &AppHandle) -> Result<(), Error> {
    let guides_dir = &app.path().app_guides_dir();

    if !guides_dir.exists() {
        fs::create_dir_all(guides_dir).map_err(Error::CreateGuidesDir)?;
    }

    Ok(())
}

pub async fn download_default_guide(app: &AppHandle) -> Result<Guides, Error> {
    download_guide_by_id(app, DEFAULT_GUIDE_ID).await
}

#[tauri::command]
pub fn get_guides(app: AppHandle) -> Result<Guides, Error> {
    Guides::from_handle(&app)
}

#[tauri::command]
pub async fn get_guide_from_server(guide_id: u32) -> Result<GuideWithSteps, Error> {
    println!("[Guides] get_guide_from_server: {}", guide_id);

    let res = reqwest::get(format!("{}/guides/{}", GANYMEDE_API_V2, guide_id))
        .await
        .map_err(Error::RequestGuide)?;
    let text = res.text().await.map_err(Error::RequestGuideContent)?;

    crate::json::from_str::<GuideWithSteps>(text.as_str()).map_err(Error::GuideWithStepsMalformed)
}

#[tauri::command]
pub async fn get_guides_from_server(status: Status) -> Result<Vec<Guide>, Error> {
    println!("[Guides] get_guides_from_server");

    let res = reqwest::get(format!("{}/guides?status={}", GANYMEDE_API_V2, status))
        .await
        .map_err(Error::RequestGuides)?;

    let text = res.text().await.map_err(Error::RequestGuidesContent)?;

    crate::json::from_str::<Vec<Guide>>(text.as_str()).map_err(Error::GuidesMalformed)
}

#[tauri::command]
pub async fn download_guide_from_server(guide_id: u32, app: AppHandle) -> Result<Guides, Error> {
    println!("[Guides] download_guide_from_server");

    Ok(download_guide_by_id(&app, guide_id).await?)
}

#[tauri::command]
pub fn open_guides_folder(window: Window<Wry>) -> Result<(), tauri_plugin_shell::Error> {
    let resolver = window.path();
    let guides_dir = resolver.app_guides_dir();

    window
        .app_handle()
        .shell()
        .open(guides_dir.to_str().unwrap().to_string(), None)
}

async fn download_guide_by_id(app: &AppHandle, guide_id: u32) -> Result<Guides, Error> {
    let guide = get_guide_from_server(guide_id).await?;
    let guide_ref = &guide;
    let mut guides = Guides::from_handle(app)?;

    // Update the guide file if it exists
    match guides.guides.iter().position(|g| g.id == guide_ref.id) {
        Some(index) => guides.guides[index] = guide,
        None => guides.guides.push(guide),
    }

    guides.save(app)?;

    Ok(guides)
}
