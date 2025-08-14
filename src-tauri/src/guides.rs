use crate::api::GANYMEDE_API;
use crate::tauri_api_ext::GuidesPathExt;
use log::{debug, info};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::{fmt, fs, vec};
use tauri::{AppHandle, Manager};
use tauri_plugin_http::reqwest;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_sentry::sentry;

pub const DEFAULT_GUIDE_ID: u32 = 1074;

#[derive(Debug, Serialize, thiserror::Error)]
pub enum Error {
    #[error("cannot parse glob pattern: {0}")]
    Pattern(String),
    #[error("cannot read the guides directory glob: {0}")]
    ReadGuidesDirGlob(String),
    #[error("cannot read a guide file: {0}")]
    ReadGuideFile(String),
    #[error("malformed guide: {0}")]
    GuideMalformed(#[from] crate::json::Error),
    #[error("cannot serialize guide: {0}")]
    SerializeGuide(crate::json::Error),
    #[error("cannot create the guides directory: {0}")]
    CreateGuidesDir(String),
    #[error("cannot write a guide file: {0}")]
    WriteGuideFile(String),
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
}

#[taurpc::ipc_type]
pub struct User {
    pub id: u32,
    pub name: String,
    pub is_admin: u8,
    pub is_certified: u8,
}

#[derive(Serialize, Deserialize, Clone, taurpc::specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum GuideLang {
    En,
    Fr,
    Es,
    Pt,
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

#[derive(Serialize, Deserialize, Clone, taurpc::specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum GuidesOrFolder {
    Guide(GuideWithSteps),
    Folder(Folder),
}

#[derive(Debug)]
#[taurpc::ipc_type]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    pub quests: Vec<QuestSummary>,
}

#[derive(Debug, PartialEq, Eq, Hash, Serialize, Deserialize, Clone, taurpc::specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum SummaryQuestStatus {
    Setup(u32),
    Started(u32),
    InProgress(u32),
    Completed(u32),
}

#[derive(Debug)]
#[taurpc::ipc_type]
#[serde(rename_all = "camelCase")]
pub struct QuestSummary {
    pub name: String,
    pub statuses: Vec<SummaryQuestStatus>,
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

impl GuidesOrFolder {
    pub fn from_handle(
        app: &AppHandle,
        folder: Option<String>,
    ) -> Result<Vec<GuidesOrFolder>, Error> {
        let mut guide_folder = app.path().app_guides_dir();

        if let Some(folder) = folder {
            guide_folder = guide_folder.join(folder);
        }

        println!("[Guides] get_guides_or_folder in {:?}", guide_folder);

        let mut result = vec![];

        for entry in
            fs::read_dir(guide_folder).map_err(|err| Error::ReadGuidesDir(err.to_string()))?
        {
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
}

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

impl Guides {
    fn from_path(path_buf: &PathBuf) -> Result<Guides, Error> {
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

    fn from_handle(app: &AppHandle, folder: String) -> Result<Guides, Error> {
        let mut guides_dir = app.path().app_guides_dir();

        if folder != "" {
            guides_dir = guides_dir.join(folder);
        }

        Guides::from_path(&guides_dir)
    }

    fn write(&self, app: &AppHandle) -> Result<(), Error> {
        let guides_dir = &app.path().app_guides_dir();

        for guide in &self.guides {
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

            fs::write(file.as_path(), json)
                .map_err(|err| Error::WriteGuideFile(err.to_string()))?;
        }

        Ok(())
    }

    fn add_or_replace(&mut self, guide: GuideWithSteps) -> Result<(), Error> {
        let guide_ref = &guide;

        // Update the guide file if it exists
        match self.guides.iter().position(|g| g.id == guide_ref.id) {
            Some(index) => self.guides[index] = guide,
            None => self.guides.push(guide),
        }

        Ok(())
    }
}

#[taurpc::procedures(path = "guides", event_trigger = GuidesEventTrigger, export_to = "../src/ipc/bindings.ts")]
pub trait GuidesApi {
    #[taurpc(alias = "getFlatGuides")]
    async fn get_flat_guides(
        app_handle: AppHandle,
        folder: String,
    ) -> Result<Vec<GuideWithSteps>, Error>;
    #[taurpc(alias = "getGuides")]
    async fn get_guides(
        app_handle: AppHandle,
        folder: Option<String>,
    ) -> Result<Vec<GuidesOrFolder>, Error>;
    #[taurpc(alias = "getGuideFromServer")]
    async fn get_guide_from_server(
        app_handle: AppHandle,
        guide_id: u32,
    ) -> Result<GuideWithSteps, Error>;
    #[taurpc(alias = "getGuidesFromServer")]
    async fn get_guides_from_server(
        app_handle: AppHandle,
        status: Option<Status>,
    ) -> Result<Vec<Guide>, Error>;
    #[taurpc(alias = "downloadGuideFromServer")]
    async fn download_guide_from_server(
        app_handle: AppHandle,
        guide_id: u32,
        folder: String,
    ) -> Result<Guides, Error>;
    #[taurpc(alias = "openGuidesFolder")]
    async fn open_guides_folder(app_handle: AppHandle) -> Result<(), tauri_plugin_opener::Error>;
    #[taurpc(alias = "getGuideSummary")]
    async fn get_guide_summary(app_handle: AppHandle, guide_id: u32) -> Result<Summary, Error>;
    #[taurpc(alias = "updateAllAtOnce")]
    async fn update_all_at_once(
        app_handle: AppHandle,
    ) -> Result<HashMap<u32, UpdateAllAtOnceResult>, Error>;
    #[taurpc(alias = "hasGuidesNotUpdated")]
    async fn has_guides_not_updated(app_handle: AppHandle) -> Result<bool, Error>;
    #[taurpc(alias = "deleteGuidesFromSystem")]
    async fn delete_guides_from_system(
        app_handle: AppHandle,
        guides_or_folders_to_delete: Vec<GuideOrFolderToDelete>,
    ) -> Result<(), Error>;
    #[taurpc(event, alias = "copyCurrentGuideStep")]
    async fn copy_current_guide_step();
    #[taurpc(alias = "guideExists")]
    async fn guide_exists(app_handle: AppHandle, guide_id: u32) -> Result<bool, Error>;
}

#[derive(Clone)]
pub struct GuidesApiImpl;

#[taurpc::resolvers]
impl GuidesApi for GuidesApiImpl {
    async fn get_flat_guides(
        self,
        app: AppHandle,
        folder: String,
    ) -> Result<Vec<GuideWithSteps>, Error> {
        let guides = Guides::from_handle(&app, folder)?;

        Ok(guides.guides.into_iter().collect())
    }

    async fn get_guides(
        self,
        app: AppHandle,
        folder: Option<String>,
    ) -> Result<Vec<GuidesOrFolder>, Error> {
        GuidesOrFolder::from_handle(&app, folder)
    }

    async fn get_guide_from_server(
        self,
        app_handle: AppHandle,
        guide_id: u32,
    ) -> Result<GuideWithSteps, Error> {
        get_guide_from_server(guide_id, &app_handle.state::<reqwest::Client>()).await
    }

    async fn get_guides_from_server(
        self,
        app_handle: AppHandle,
        status: Option<Status>,
    ) -> Result<Vec<Guide>, Error> {
        info!("[Guides] get_guides_from_server, status: {:?}", status);

        sentry::add_breadcrumb(sentry::Breadcrumb {
            ty: "sentry.transaction".into(),
            message: Some("Get guides from server".into()),
            data: {
                let mut map = sentry::protocol::Map::new();

                if let Some(status) = status.clone() {
                    map.insert("status".into(), status.to_string().into());
                } else {
                    map.insert("status".into(), "all".into());
                }

                map
            },
            ..Default::default()
        });

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

    async fn download_guide_from_server(
        self,
        app: AppHandle,
        guide_id: u32,
        folder: String,
    ) -> Result<Guides, Error> {
        info!("[Guides] download_guide_from_server");
        sentry::add_breadcrumb(sentry::Breadcrumb {
            ty: "sentry.transaction".into(),
            message: Some("Download guide from server".into()),
            data: {
                let mut map = sentry::protocol::Map::new();

                map.insert("guide_id".into(), guide_id.into());
                map.insert("folder".into(), folder.clone().into());

                map
            },
            ..Default::default()
        });

        let mut guides = Guides::from_handle(&app, folder.clone())?;

        download_guide_by_id(&app, &mut guides, guide_id, folder).await?;

        guides.write(&app)?;

        Ok(guides)
    }

    async fn open_guides_folder(self, app: AppHandle) -> Result<(), tauri_plugin_opener::Error> {
        let resolver = app.app_handle().path();
        let guides_dir = resolver.app_guides_dir();

        app.opener()
            .open_path(guides_dir.to_str().unwrap().to_string(), None::<String>)
    }

    async fn get_guide_summary(
        self,
        app_handle: AppHandle,
        guide_id: u32,
    ) -> Result<Summary, Error> {
        let start = std::time::Instant::now();
        info!("[Guides] get_guide_summary: {}", guide_id);

        sentry::add_breadcrumb(sentry::Breadcrumb {
            ty: "sentry.transaction".into(),
            message: Some("Get guide summary".into()),
            data: {
                let mut map = sentry::protocol::Map::new();

                map.insert("guide_id".into(), guide_id.into());

                map
            },
            ..Default::default()
        });

        let guides = self.get_flat_guides(app_handle, "".into()).await?;
        let guide = guides.iter().find(|g| g.id == guide_id);

        match guide {
            Some(guide) => {
                // parse the guide html content and extract all quests
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

                let summary = Summary { quests };

                info!("[Guides] get_guide_summary: {} in {:?}", guide_id, duration);

                Ok(summary)
            }
            None => Err(Error::GetGuideInSystem(guide_id)),
        }
    }

    async fn update_all_at_once(
        self,
        app_handle: AppHandle,
    ) -> Result<HashMap<u32, UpdateAllAtOnceResult>, Error> {
        info!("[Guides] update_all_at_once");

        let mut guides = Guides::from_handle(&app_handle, "".to_string())?;
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

        guides.write(&app_handle)?;

        Ok(results)
    }

    async fn has_guides_not_updated(self, app_handle: AppHandle) -> Result<bool, Error> {
        info!("[Guides] has_guides_not_updated");

        let guides_in_server = self
            .get_guides_from_server(app_handle.clone(), None)
            .await?;

        let guides_in_system = Guides::from_handle(&app_handle, "".to_string())?;

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

    async fn delete_guides_from_system(
        self,
        app_handle: AppHandle,
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

    async fn guide_exists(self, app_handle: AppHandle, guide_id: u32) -> Result<bool, Error> {
        debug!("[Guides] Checking if guide {} exists", guide_id);

        let guides = self.get_flat_guides(app_handle, "".into()).await?;
        let exists = guides.iter().any(|g| g.id == guide_id);

        debug!("[Guides] Guide {} exists: {}", guide_id, exists);
        Ok(exists)
    }
}

pub fn ensure(app: &AppHandle) -> Result<(), Error> {
    let guides_dir = &app.path().app_guides_dir();

    info!("Log dir: {:?}", &app.path().app_log_dir().unwrap());

    if !guides_dir.exists() {
        fs::create_dir_all(guides_dir).map_err(|err| Error::CreateGuidesDir(err.to_string()))?;
    }

    Ok(())
}

pub async fn download_default_guide(app: &AppHandle) -> Result<Guides, Error> {
    let mut guides = Guides::from_handle(app, "".into())?;

    download_guide_by_id(app, &mut guides, DEFAULT_GUIDE_ID, "".into()).await?;

    guides.write(app)?;

    Ok(guides)
}

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

async fn download_guide_by_id(
    app: &AppHandle,
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

    guides.add_or_replace(guide)?;

    Ok(())
}

// implement a command to know if a guide is downloaded, with glob pattern, so in front we can display the button and know where it is
// warn if the guide is in two places or more
