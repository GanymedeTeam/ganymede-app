use std::{collections::HashMap, fmt, fs, path::PathBuf, vec};

use log::{debug, info};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_http::reqwest;
use tauri_plugin_opener::OpenerExt;

use crate::{api::GANYMEDE_API, tauri_api_ext::GuidesPathExt};

pub const DEFAULT_GUIDE_ID: u32 = 1074;

// ================================================================================================
// Enums
// ================================================================================================

#[derive(Debug, Serialize, thiserror::Error, taurpc::specta::Type)]
#[specta(rename = "GuidesError")]
pub enum Error {
    #[error("cannot parse glob pattern: {0}")]
    Pattern(String),
    #[error("cannot read the guides directory glob: {0}")]
    ReadGuidesDirGlob(String),
    #[error("cannot read a guide file: {0}")]
    ReadGuideFile(String),
    #[error("cannot read a recent guides file: {0}")]
    ReadRecentGuidesFile(String),
    #[error("malformed guide: {0}")]
    GuideMalformed(#[from] crate::json::Error),
    #[error("malformed recent guides file: {0}")]
    RecentGuidesFileMalformed(String),
    #[error("cannot serialize guide: {0}")]
    SerializeGuide(crate::json::Error),
    #[error("cannot serialize recent guides file: {0}")]
    SerializeRecentGuidesFile(crate::json::Error),
    #[error("cannot create the guides directory: {0}")]
    CreateGuidesDir(String),
    #[error("cannot write a guide file: {0}")]
    WriteGuideFile(String),
    #[error("cannot write recent guides file: {0}")]
    WriteRecentGuidesFile(String),
    #[error("cannot request a guide from server: {0}")]
    RequestGuide(String),
    #[error("cannot get the content of a guide request: {0}")]
    RequestGuideContent(String),
    #[error("cannot request guides from server: {0}")]
    RequestGuides(String),
    #[error("cannot get the content of a guides request: {0}")]
    RequestGuidesContent(String),
    #[error("malformed guide with steps: {0}")]
    GuideWithStepsMalformed(crate::json::Error),
    #[error("malformed guides: {0}")]
    GuidesMalformed(crate::json::Error),
    #[error("cannot read the guides directory: {0}")]
    ReadGuidesDir(String),
    #[error("cannot get guide in system: {0}")]
    GetGuideInSystem(u32),
    #[error("cannot delete guide file in system: {0}")]
    DeleteGuideFileInSystem(String),
    #[error("cannot delete guide folder in system: {0}")]
    DeleteGuideFolderInSystem(String),
    #[error("error in opener plugin")]
    Opener(String),
}

#[derive(Serialize, Deserialize, Clone, taurpc::specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum GuideLang {
    En,
    Fr,
    Es,
    Pt,
}

#[derive(Debug, Default, Serialize, Deserialize, Clone, taurpc::specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum GameType {
    #[default]
    Dofus,
    Wakfu,
}

#[derive(Debug, Serialize, Deserialize, Clone, taurpc::specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum Status {
    Draft,
    Public,
    Private,
    Certified,
    Gp,
}

#[derive(Debug, PartialEq, Eq, Hash, Serialize, Deserialize, Clone, taurpc::specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum SummaryQuestStatus {
    Setup(u32),
    Started(u32),
    InProgress(u32),
    Completed(u32),
}

#[derive(Serialize, Deserialize, Clone, taurpc::specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum GuidesOrFolder {
    Guide(GuideWithSteps),
    Folder(Folder),
}

#[derive(Serialize, Clone, taurpc::specta::Type)]
#[serde(untagged, rename_all = "camelCase")]
pub enum UpdateAllAtOnceResult {
    Success,
    Failure(String),
}

#[derive(Debug, Serialize, Deserialize, Clone, taurpc::specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum GuideOrFolderToDelete {
    Guide { id: u32, folder: Option<String> },
    Folder { folder: String },
}

// ================================================================================================
// Structs
// ================================================================================================

#[taurpc::ipc_type]
#[specta(rename = "GuideUser")]
pub struct User {
    pub id: u32,
    pub name: String,
    pub is_admin: u8,
    pub is_certified: u8,
}

#[taurpc::ipc_type]
pub struct GuideStep {
    pub name: Option<String>,
    pub map: Option<String>,
    pub pos_x: i32,
    pub pos_y: i32,
    pub web_text: String,
}

#[taurpc::ipc_type]
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
    pub lang: GuideLang,
    #[serde(default)]
    pub game_type: GameType,
    pub order: u32,
    pub user: User,
    pub user_id: u32,
    pub description: Option<String>,
    pub web_description: Option<String>,
    pub node_image: Option<String>,
}

#[taurpc::ipc_type]
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
    pub lang: GuideLang,
    #[serde(default)]
    pub game_type: GameType,
    pub order: u32,
    pub user: User,
    pub web_description: Option<String>,
    pub node_image: Option<String>,
    pub steps: Vec<GuideStep>,
    #[serde(skip_deserializing, serialize_with = "crate::json::serialize_path")]
    pub folder: Option<PathBuf>,
}

#[derive(Default)]
#[taurpc::ipc_type]
#[serde(rename_all = "camelCase")]
pub struct Guides {
    pub guides: Vec<GuideWithSteps>,
}

#[derive(Serialize, Deserialize, Clone, taurpc::specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub name: String,
}

#[derive(Debug)]
#[taurpc::ipc_type]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    pub quests: Vec<QuestSummary>,
}

#[derive(Debug)]
#[taurpc::ipc_type]
#[serde(rename_all = "camelCase")]
pub struct QuestSummary {
    pub name: String,
    pub statuses: Vec<SummaryQuestStatus>,
}

pub type RecentGuides = Vec<u32>;

// ================================================================================================
// Type Implementations
// ================================================================================================

impl Status {
    fn to_str(&self) -> &'static str {
        use Status::*;

        match self {
            Draft => "draft",
            Public => "public",
            Private => "private",
            Certified => "certified",
            Gp => "gp",
        }
    }
}

impl Into<String> for Status {
    fn into(self) -> String {
        self.to_string()
    }
}

impl fmt::Display for Status {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}", self.to_str().to_string())
    }
}

// ================================================================================================
// Public Functions
// ================================================================================================

/// Ensure the guides directory exists
pub fn ensure_guides_dir(app_handle: &AppHandle) -> Result<(), Error> {
    let guides_dir = &app_handle.path().app_guides_dir();

    if !guides_dir.exists() {
        fs::create_dir_all(guides_dir).map_err(|err| Error::CreateGuidesDir(err.to_string()))?;
    }

    Ok(())
}

/// Download the default guide (tutorial guide) into the guides directory
pub async fn download_default_guide(app: &AppHandle) -> Result<Guides, Error> {
    let mut guides = get_guides_from_handle(app, "".into())?;

    download_guide_by_id(app, &mut guides, DEFAULT_GUIDE_ID, "".into()).await?;

    write_guides(&guides, app)?;

    Ok(guides)
}

/// Fetch a guide from the server by its ID
pub async fn get_guide_from_server(
    guide_id: u32,
    http_client: &reqwest::Client,
) -> Result<GuideWithSteps, Error> {
    info!("[Guides] get_guide_from_server: {}", guide_id);

    let res = http_client
        .get(format!("{}/v2/guides/{}", GANYMEDE_API, guide_id))
        .send()
        .await
        .map_err(|err| Error::RequestGuide(err.to_string()))?;
    let text = res
        .text()
        .await
        .map_err(|err| Error::RequestGuideContent(err.to_string()))?;

    let mut guide = crate::json::from_str::<GuideWithSteps>(text.as_str())
        .map_err(Error::GuideWithStepsMalformed)?;

    guide.folder = None;

    Ok(guide)
}

// ================================================================================================
// Private Functions
// ================================================================================================

fn get_guides_or_folder_from_handle<R: Runtime>(
    app: &AppHandle<R>,
    folder: Option<String>,
) -> Result<Vec<GuidesOrFolder>, Error> {
    let mut guide_folder = app.path().app_guides_dir();

    if let Some(folder) = folder {
        guide_folder = guide_folder.join(folder);
    }

    println!("[Guides] get_guides_or_folder in {:?}", guide_folder);

    let mut result = vec![];

    for entry in fs::read_dir(guide_folder).map_err(|err| Error::ReadGuidesDir(err.to_string()))? {
        let entry = entry.map_err(|err| Error::ReadGuidesDir(err.to_string()))?;
        let path = entry.path();
        let file_name = path.file_name().unwrap().to_str().unwrap().to_string();

        if path.is_dir() {
            result.push(GuidesOrFolder::Folder(Folder { name: file_name }));
        } else if path.is_file() {
            let extension = path.extension();

            if let Some(ext) = extension {
                if ext == "json" {
                    let file = fs::read_to_string(&path)
                        .map_err(|err| Error::ReadGuideFile(err.to_string()))?;
                    let mut guide = crate::json::from_str::<GuideWithSteps>(file.as_str())
                        .map_err(Error::GuideMalformed)?;

                    guide.folder = Some(if path.is_dir() {
                        path
                    } else {
                        path.parent().unwrap().to_path_buf()
                    });

                    result.push(GuidesOrFolder::Guide(guide));
                }
            }
        }
    }

    Ok(result)
}

fn get_guides_from_path(path_buf: &PathBuf) -> Result<Guides, Error> {
    info!("[Guides] get_guides in {:?}", path_buf);

    let options = glob::MatchOptions {
        case_sensitive: false,
        require_literal_separator: false,
        require_literal_leading_dot: false,
    };

    let files = glob::glob_with(path_buf.join("**/*.json").to_str().unwrap(), options)
        .map_err(|err| Error::Pattern(err.to_string()))?;

    let mut guides = vec![];

    for entry in files {
        let file_path = entry.map_err(|err| Error::ReadGuidesDirGlob(err.to_string()))?;

        let file = fs::read_to_string(file_path.to_str().unwrap())
            .map_err(|err| Error::ReadGuideFile(err.to_string()))?;

        let mut guide = crate::json::from_str::<GuideWithSteps>(file.as_str())
            .map_err(Error::GuideMalformed)?;

        guide.folder = Some(if file_path.is_dir() {
            file_path
        } else {
            file_path.parent().unwrap().to_path_buf()
        });

        if guides.iter().any(|g: &GuideWithSteps| g.id == guide.id) {
            continue;
        }

        guides.push(guide);
    }

    Ok(Guides { guides })
}

fn get_guides_from_handle<R: Runtime>(app: &AppHandle<R>, folder: String) -> Result<Guides, Error> {
    let mut guides_dir = app.path().app_guides_dir();

    if folder != "" {
        guides_dir = guides_dir.join(folder);
    }

    get_guides_from_path(&guides_dir)
}

fn write_guides<R: Runtime>(guides: &Guides, app: &AppHandle<R>) -> Result<(), Error> {
    let guides_dir = &app.path().app_guides_dir();

    for guide in &guides.guides {
        let json = crate::json::serialize_pretty(guide).map_err(Error::SerializeGuide)?;

        if !guides_dir.exists() {
            fs::create_dir_all(guides_dir)
                .map_err(|err| Error::CreateGuidesDir(err.to_string()))?;
        }

        let file = guide
            .folder
            .as_ref()
            .unwrap_or(guides_dir)
            .join(format!("{}.json", guide.id));

        debug!("Writing guide to {:?}", file);

        fs::write(file.as_path(), json).map_err(|err| Error::WriteGuideFile(err.to_string()))?;
    }

    Ok(())
}

fn add_or_replace_guide(guides: &mut Guides, guide: GuideWithSteps) -> Result<(), Error> {
    let guide_ref = &guide;

    // Update the guide file if it exists
    match guides.guides.iter().position(|g| g.id == guide_ref.id) {
        Some(index) => guides.guides[index] = guide,
        None => guides.guides.push(guide),
    }

    Ok(())
}

/// Download a guide by its ID and save it into the specified folder
async fn download_guide_by_id<R: Runtime>(
    app: &AppHandle<R>,
    guides: &mut Guides,
    guide_id: u32,
    folder: String,
) -> Result<(), Error> {
    let http_client = app.state::<reqwest::Client>();
    let mut guide = get_guide_from_server(guide_id, &http_client).await?;

    guide.folder = Some(app.path().app_guides_dir().join(folder.clone()));

    debug!(
        "[Guides] download_guide_by_id: {} in {:?} (via {})",
        guide_id, guide.folder, folder
    );

    add_or_replace_guide(guides, guide)?;

    Ok(())
}

fn register_guide_open<R: Runtime>(app_handle: AppHandle<R>, guide_id: u32) -> Result<(), Error> {
    debug!("[Guides] register_guide_open for guide {guide_id}");

    let recent_guides_path = app_handle.path().app_recent_guides_file();

    let mut recent_guides_list = read_recent_guides_file(&recent_guides_path)?;

    if !recent_guides_list.contains(&guide_id) {
        recent_guides_list.insert(0, guide_id); // Add to the start of the list
        if recent_guides_list.len() > 6 {
            recent_guides_list.pop(); // Keep only the last 6 entries
        }

        write_recent_guides_file(&recent_guides_path, &recent_guides_list)?;
    }

    Ok(())
}

fn register_guide_close<R: Runtime>(app_handle: AppHandle<R>, guide_id: u32) -> Result<(), Error> {
    debug!("[Guides] register_guide_close for guide {guide_id}");

    let recent_guides_path = app_handle.path().app_recent_guides_file();

    let mut recent_guides_list = read_recent_guides_file(&recent_guides_path)?;

    recent_guides_list.retain(|&id| id != guide_id);

    write_recent_guides_file(&recent_guides_path, &recent_guides_list)?;

    Ok(())
}

fn get_recent_guides<R: Runtime>(app_handle: AppHandle<R>) -> Result<RecentGuides, Error> {
    debug!("[Guides] get_recent_guides");

    let recent_guides_path = app_handle.path().app_recent_guides_file();

    let mut recent_guides = read_recent_guides_file(&recent_guides_path)?;
    let guides_in_system = get_guides_from_handle(&app_handle, "".to_string())?.guides;

    // remove any guide IDs that are no longer in the system since the last session
    recent_guides.retain(|id| guides_in_system.iter().any(|g| g.id == *id));

    Ok(recent_guides)
}

fn write_recent_guides_file(
    recent_guides_path: &PathBuf,
    recent_guides: &RecentGuides,
) -> Result<(), Error> {
    let json =
        crate::json::serialize_pretty(recent_guides).map_err(Error::SerializeRecentGuidesFile)?;

    debug!(
        "[Guides] writing recent guides file: {:?}",
        recent_guides_path
    );

    fs::write(recent_guides_path.as_path(), json)
        .map_err(|err| Error::WriteRecentGuidesFile(err.to_string()))?;

    Ok(())
}

fn read_recent_guides_file(recent_guides_path: &PathBuf) -> Result<RecentGuides, Error> {
    if recent_guides_path.exists() {
        debug!("[Guides] reading recent guides file",);

        let file = fs::read_to_string(&recent_guides_path)
            .map_err(|err| Error::ReadRecentGuidesFile(err.to_string()))?;
        let recent_guides_list = crate::json::from_str::<RecentGuides>(file.as_str())
            .map_err(|err| Error::RecentGuidesFileMalformed(err.to_string()))?;

        Ok(recent_guides_list)
    } else {
        debug!("[Guides] recent guides file does not exist, returning empty list");

        Ok(vec![])
    }
}

fn fetch_guides_from_server<R: Runtime>(
    app_handle: &AppHandle<R>,
    status: Option<Status>,
) -> impl std::future::Future<Output = Result<Vec<Guide>, Error>> + Send {
    let app_handle = app_handle.clone();
    async move {
        info!("[Guides] get_guides_from_server, status: {:?}", status);

        #[cfg(not(debug_assertions))]
        {
            use tauri_plugin_sentry::sentry::{add_breadcrumb, protocol::Map, Breadcrumb};

            add_breadcrumb(Breadcrumb {
                ty: "sentry.transaction".into(),
                message: Some("Get guides from server".into()),
                data: {
                    let mut map = Map::new();

                    if let Some(status) = status.clone() {
                        map.insert("status".into(), status.to_string().into());
                    } else {
                        map.insert("status".into(), "all".into());
                    }

                    map
                },
                ..Default::default()
            });
        }

        let http_client = app_handle.state::<reqwest::Client>();

        let url = if let Some(status) = status {
            format!("{}/v2/guides?status={}", GANYMEDE_API, status.to_str())
        } else {
            format!("{}/v2/guides", GANYMEDE_API)
        };

        let res = http_client
            .get(url)
            .send()
            .await
            .map_err(|err| Error::RequestGuides(err.to_string()))?;

        let text = res
            .text()
            .await
            .map_err(|err| Error::RequestGuidesContent(err.to_string()))?;

        crate::json::from_str::<Vec<Guide>>(text.as_str()).map_err(Error::GuidesMalformed)
    }
}

fn download_and_save_guide<R: Runtime>(
    app: &AppHandle<R>,
    guide_id: u32,
    folder: String,
) -> impl std::future::Future<Output = Result<Guides, Error>> + Send {
    let app = app.clone();
    async move {
        info!("[Guides] download_guide_from_server");
        #[cfg(not(debug_assertions))]
        {
            use tauri_plugin_sentry::sentry::{add_breadcrumb, protocol::Map, Breadcrumb};

            add_breadcrumb(Breadcrumb {
                ty: "sentry.transaction".into(),
                message: Some("Download guide from server".into()),
                data: {
                    let mut map = Map::new();

                    map.insert("guide_id".into(), guide_id.into());
                    map.insert("folder".into(), folder.clone().into());

                    map
                },
                ..Default::default()
            });
        }

        let mut guides = get_guides_from_handle(&app, folder.clone())?;

        download_guide_by_id(&app, &mut guides, guide_id, folder).await?;

        write_guides(&guides, &app)?;

        Ok(guides)
    }
}

fn open_system_guides_folder<R: Runtime>(app: &AppHandle<R>) -> Result<(), Error> {
    let resolver = app.app_handle().path();
    let guides_dir = resolver.app_guides_dir();

    app.opener()
        .open_path(guides_dir.to_str().unwrap().to_string(), None::<String>)
        .map_err(|err| Error::Opener(err.to_string()))
}

fn generate_guide_summary<R: Runtime>(
    app_handle: &AppHandle<R>,
    guide_id: u32,
) -> impl std::future::Future<Output = Result<Summary, Error>> + Send {
    let app_handle = app_handle.clone();
    async move {
        let start = std::time::Instant::now();
        info!("[Guides] get_guide_summary: {}", guide_id);

        #[cfg(not(debug_assertions))]
        {
            use tauri_plugin_sentry::sentry::{add_breadcrumb, protocol::Map, Breadcrumb};

            add_breadcrumb(Breadcrumb {
                ty: "sentry.transaction".into(),
                message: Some("Get guide summary".into()),
                data: {
                    let mut map = Map::new();

                    map.insert("guide_id".into(), guide_id.into());

                    map
                },
                ..Default::default()
            });
        }

        let guides = get_guides_from_handle(&app_handle, "".to_string())?;
        let guide = guides.guides.iter().find(|g| g.id == guide_id);

        match guide {
            Some(guide) => {
                let mut quests: Vec<QuestSummary> = vec![];

                for (step_index, step) in guide.steps.iter().enumerate() {
                    let document = scraper::Html::parse_document(&step.web_text);

                    let quest_selector =
                        scraper::Selector::parse("[data-type='quest-block']").unwrap();

                    for element in document.select(&quest_selector) {
                        let quest_name = element.value().attr("questname");
                        let status = element.value().attr("status");
                        if let (Some(name), Some(status)) = (quest_name, status) {
                            let summary_quest_status = match status {
                                "setup" => SummaryQuestStatus::Setup(step_index as u32 + 1),
                                "start" => SummaryQuestStatus::Started(step_index as u32 + 1),
                                "in_progress" => {
                                    SummaryQuestStatus::InProgress(step_index as u32 + 1)
                                }
                                "end" => SummaryQuestStatus::Completed(step_index as u32 + 1),
                                _ => continue,
                            };

                            if let Some(quest) = quests.iter_mut().find(|q| q.name == name) {
                                let in_vec_status =
                                    quest.statuses.iter().any(|s| s == &summary_quest_status);

                                if !in_vec_status {
                                    quest.statuses.push(summary_quest_status);
                                }
                            } else {
                                let mut statuses = vec![];
                                statuses.push(summary_quest_status);
                                quests.push(QuestSummary {
                                    name: name.to_string(),
                                    statuses,
                                });
                            }
                        }
                    }
                }

                let duration = start.elapsed();

                // Sort statuses within each quest by step number
                for quest in &mut quests {
                    quest.statuses.sort_by(|a, b| {
                        let a_value = match a {
                            SummaryQuestStatus::Setup(v)
                            | SummaryQuestStatus::Started(v)
                            | SummaryQuestStatus::InProgress(v)
                            | SummaryQuestStatus::Completed(v) => v,
                        };
                        let b_value = match b {
                            SummaryQuestStatus::Setup(v)
                            | SummaryQuestStatus::Started(v)
                            | SummaryQuestStatus::InProgress(v)
                            | SummaryQuestStatus::Completed(v) => v,
                        };
                        a_value.cmp(&b_value)
                    });

                    debug!("[Guides] quest: {:?}", quest);
                }

                // Sort quests by their first non-setup status
                quests.sort_by(|a, b| {
                    let get_first_non_setup_step = |quest: &QuestSummary| -> Option<u32> {
                        quest.statuses.iter().find_map(|s| match s {
                            SummaryQuestStatus::Started(v)
                            | SummaryQuestStatus::InProgress(v)
                            | SummaryQuestStatus::Completed(v) => Some(*v),
                            SummaryQuestStatus::Setup(_) => None,
                        })
                    };

                    let a_step = get_first_non_setup_step(a);
                    let b_step = get_first_non_setup_step(b);

                    match (a_step, b_step) {
                        (Some(a_val), Some(b_val)) => a_val.cmp(&b_val),
                        (Some(_), None) => std::cmp::Ordering::Less,  // Non-setup before setup-only
                        (None, Some(_)) => std::cmp::Ordering::Greater,
                        (None, None) => {
                            // Both setup-only: compare first status step
                            let a_val = match a.statuses.first() {
                                Some(SummaryQuestStatus::Setup(v)) => v,
                                _ => unreachable!(),
                            };
                            let b_val = match b.statuses.first() {
                                Some(SummaryQuestStatus::Setup(v)) => v,
                                _ => unreachable!(),
                            };
                            a_val.cmp(b_val)
                        }
                    }
                });

                let summary = Summary { quests };

                info!("[Guides] get_guide_summary: {} in {:?}", guide_id, duration);

                Ok(summary)
            }
            None => Err(Error::GetGuideInSystem(guide_id)),
        }
    }
}

fn update_all_guides_batch<R: Runtime>(
    app_handle: &AppHandle<R>,
) -> impl std::future::Future<Output = Result<HashMap<u32, UpdateAllAtOnceResult>, Error>> + Send {
    let app_handle = app_handle.clone();
    async move {
        info!("[Guides] update_all_at_once");

        let mut guides = get_guides_from_handle(&app_handle, "".to_string())?;
        let mut results = HashMap::new();

        for guide in guides.guides.clone() {
            if let Some(folder) = &guide.folder {
                let result = download_guide_by_id(
                    &app_handle,
                    &mut guides,
                    guide.id,
                    folder.to_str().unwrap().to_string(),
                )
                .await;

                match result {
                    Ok(_) => {
                        results.insert(guide.id, UpdateAllAtOnceResult::Success);
                    }
                    Err(err) => {
                        results.insert(guide.id, UpdateAllAtOnceResult::Failure(err.to_string()));
                    }
                }
            }
        }

        write_guides(&guides, &app_handle)?;

        Ok(results)
    }
}

fn check_guides_need_update<R: Runtime>(
    app_handle: &AppHandle<R>,
) -> impl std::future::Future<Output = Result<bool, Error>> + Send {
    let app_handle = app_handle.clone();
    async move {
        info!("[Guides] has_guides_not_updated");

        let guides_in_server = fetch_guides_from_server(&app_handle, None).await?;

        let guides_in_system = get_guides_from_handle(&app_handle, "".to_string())?;

        for guide in guides_in_server {
            if let Some(guide_in_system) = guides_in_system.guides.iter().find(|g| g.id == guide.id)
            {
                if guide.updated_at != guide_in_system.updated_at {
                    return Ok(true);
                }
            }
        }

        Ok(false)
    }
}

fn delete_guides_and_folders<R: Runtime>(
    app_handle: &AppHandle<R>,
    guides_or_folders_to_delete: Vec<GuideOrFolderToDelete>,
) -> Result<(), Error> {
    info!(
        "[Guides] delete_guides_from_system: {:?}",
        guides_or_folders_to_delete
    );

    let guides_dir = app_handle.path().app_guides_dir();

    for guide_or_folder_to_delete in guides_or_folders_to_delete {
        let mut path = guides_dir.clone();

        match guide_or_folder_to_delete {
            GuideOrFolderToDelete::Guide { id, folder } => {
                if let Some(folder) = folder {
                    path = path.join(folder);
                }

                path = path.join(format!("{}.json", id));
            }
            GuideOrFolderToDelete::Folder { folder } => {
                path = path.join(folder);
            }
        }

        info!("[Guides] deleting the following path: {:?}", path);

        if path.exists() {
            if path.is_dir() {
                fs::remove_dir_all(path)
                    .map_err(|err| Error::DeleteGuideFolderInSystem(err.to_string()))?;
            } else {
                fs::remove_file(path)
                    .map_err(|err| Error::DeleteGuideFileInSystem(err.to_string()))?;
            }
        }
    }

    Ok(())
}

fn check_guide_exists<R: Runtime>(
    app_handle: &AppHandle<R>,
    guide_id: u32,
) -> impl std::future::Future<Output = Result<bool, Error>> + Send {
    let app_handle = app_handle.clone();
    async move {
        debug!("[Guides] Checking if guide {} exists", guide_id);

        let guides = get_guides_from_handle(&app_handle, "".to_string())?;
        let exists = guides.guides.iter().any(|g| g.id == guide_id);

        debug!("[Guides] Guide {} exists: {}", guide_id, exists);
        Ok(exists)
    }
}

// ================================================================================================
// TauRPC API Trait & Implementation
// ================================================================================================

#[taurpc::procedures(path = "guides", event_trigger = GuidesEventTrigger, export_to = "../src/ipc/bindings.ts")]
pub trait GuidesApi {
    #[taurpc(alias = "getFlatGuides")]
    async fn get_flat_guides<R: Runtime>(
        app_handle: AppHandle<R>,
        folder: String,
    ) -> Result<Vec<GuideWithSteps>, Error>;
    #[taurpc(alias = "getGuides")]
    async fn get_guides<R: Runtime>(
        app_handle: AppHandle<R>,
        folder: Option<String>,
    ) -> Result<Vec<GuidesOrFolder>, Error>;
    #[taurpc(alias = "getGuideFromServer")]
    async fn get_guide_from_server<R: Runtime>(
        app_handle: AppHandle<R>,
        guide_id: u32,
    ) -> Result<GuideWithSteps, Error>;
    #[taurpc(alias = "getGuidesFromServer")]
    async fn get_guides_from_server<R: Runtime>(
        app_handle: AppHandle<R>,
        status: Option<Status>,
    ) -> Result<Vec<Guide>, Error>;
    #[taurpc(alias = "downloadGuideFromServer")]
    async fn download_guide_from_server<R: Runtime>(
        app_handle: AppHandle<R>,
        guide_id: u32,
        folder: String,
    ) -> Result<Guides, Error>;
    #[taurpc(alias = "openGuidesFolder")]
    async fn open_guides_folder<R: Runtime>(app_handle: AppHandle<R>) -> Result<(), Error>;
    #[taurpc(alias = "getGuideSummary")]
    async fn get_guide_summary<R: Runtime>(
        app_handle: AppHandle<R>,
        guide_id: u32,
    ) -> Result<Summary, Error>;
    #[taurpc(alias = "updateAllAtOnce")]
    async fn update_all_at_once<R: Runtime>(
        app_handle: AppHandle<R>,
    ) -> Result<HashMap<u32, UpdateAllAtOnceResult>, Error>;
    #[taurpc(alias = "hasGuidesNotUpdated")]
    async fn has_guides_not_updated<R: Runtime>(app_handle: AppHandle<R>) -> Result<bool, Error>;
    #[taurpc(alias = "deleteGuidesFromSystem")]
    async fn delete_guides_from_system<R: Runtime>(
        app_handle: AppHandle<R>,
        guides_or_folders_to_delete: Vec<GuideOrFolderToDelete>,
    ) -> Result<(), Error>;
    #[taurpc(event, alias = "copyCurrentGuideStep")]
    async fn copy_current_guide_step<R: Runtime>(app_handle: AppHandle<R>);
    #[taurpc(alias = "guideExists")]
    async fn guide_exists<R: Runtime>(
        app_handle: AppHandle<R>,
        guide_id: u32,
    ) -> Result<bool, Error>;
    #[taurpc(alias = "registerGuideOpen")]
    async fn register_guide_open<R: Runtime>(
        app_handle: AppHandle<R>,
        guide_id: u32,
    ) -> Result<(), Error>;
    #[taurpc(alias = "registerGuideClose")]
    async fn register_guide_close<R: Runtime>(
        app_handle: AppHandle<R>,
        guide_id: u32,
    ) -> Result<(), Error>;
    #[taurpc(alias = "getRecentGuides")]
    async fn get_recent_guides<R: Runtime>(app_handle: AppHandle<R>)
        -> Result<RecentGuides, Error>;
}

#[derive(Clone)]
pub struct GuidesApiImpl;

#[taurpc::resolvers]
impl GuidesApi for GuidesApiImpl {
    async fn get_flat_guides<R: Runtime>(
        self,
        app: AppHandle<R>,
        folder: String,
    ) -> Result<Vec<GuideWithSteps>, Error> {
        let guides = get_guides_from_handle(&app, folder)?;

        Ok(guides.guides.into_iter().collect())
    }

    async fn get_guides<R: Runtime>(
        self,
        app: AppHandle<R>,
        folder: Option<String>,
    ) -> Result<Vec<GuidesOrFolder>, Error> {
        get_guides_or_folder_from_handle(&app, folder)
    }

    async fn get_guide_from_server<R: Runtime>(
        self,
        app_handle: AppHandle<R>,
        guide_id: u32,
    ) -> Result<GuideWithSteps, Error> {
        get_guide_from_server(guide_id, &app_handle.state::<reqwest::Client>()).await
    }

    async fn get_guides_from_server<R: Runtime>(
        self,
        app_handle: AppHandle<R>,
        status: Option<Status>,
    ) -> Result<Vec<Guide>, Error> {
        fetch_guides_from_server(&app_handle, status).await
    }

    async fn download_guide_from_server<R: Runtime>(
        self,
        app: AppHandle<R>,
        guide_id: u32,
        folder: String,
    ) -> Result<Guides, Error> {
        download_and_save_guide(&app, guide_id, folder).await
    }

    async fn open_guides_folder<R: Runtime>(self, app: AppHandle<R>) -> Result<(), Error> {
        open_system_guides_folder(&app)
    }

    async fn get_guide_summary<R: Runtime>(
        self,
        app_handle: AppHandle<R>,
        guide_id: u32,
    ) -> Result<Summary, Error> {
        generate_guide_summary(&app_handle, guide_id).await
    }

    async fn update_all_at_once<R: Runtime>(
        self,
        app_handle: AppHandle<R>,
    ) -> Result<HashMap<u32, UpdateAllAtOnceResult>, Error> {
        update_all_guides_batch(&app_handle).await
    }

    async fn has_guides_not_updated<R: Runtime>(
        self,
        app_handle: AppHandle<R>,
    ) -> Result<bool, Error> {
        check_guides_need_update(&app_handle).await
    }

    async fn delete_guides_from_system<R: Runtime>(
        self,
        app_handle: AppHandle<R>,
        guides_or_folders_to_delete: Vec<GuideOrFolderToDelete>,
    ) -> Result<(), Error> {
        delete_guides_and_folders(&app_handle, guides_or_folders_to_delete)
    }

    async fn guide_exists<R: Runtime>(
        self,
        app_handle: AppHandle<R>,
        guide_id: u32,
    ) -> Result<bool, Error> {
        check_guide_exists(&app_handle, guide_id).await
    }

    async fn register_guide_open<R: Runtime>(
        self,
        app_handle: AppHandle<R>,
        guide_id: u32,
    ) -> Result<(), Error> {
        register_guide_open(app_handle, guide_id)
    }

    async fn register_guide_close<R: Runtime>(
        self,
        app_handle: AppHandle<R>,
        guide_id: u32,
    ) -> Result<(), Error> {
        register_guide_close(app_handle, guide_id)
    }

    async fn get_recent_guides<R: Runtime>(
        self,
        app_handle: AppHandle<R>,
    ) -> Result<RecentGuides, Error> {
        get_recent_guides(app_handle)
    }
}
