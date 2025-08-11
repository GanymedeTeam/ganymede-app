use crate::conf::{Conf, Error as ConfError};
use log::{debug, warn};
use regex::Regex;
use tauri::AppHandle;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("failed to get conf: {0}")]
    Conf(#[from] ConfError),
    #[error("failed to parse deep link URL: {0}")]
    ParseUrl(String),
    #[error("invalid guide ID: {0}")]
    InvalidGuideId(String),
}

#[taurpc::ipc_type]
#[derive(Debug)]
pub struct OpenGuideStep {
    pub step: u32,
    #[serde(rename = "progressionStep")]
    pub progression_step: Option<u32>,
}

impl Default for OpenGuideStep {
    fn default() -> Self {
        OpenGuideStep {
            step: 0,
            progression_step: None,
        }
    }
}

#[taurpc::procedures(
    path = "deep_link",
    event_trigger = DeepLinkApiEventTrigger,
    export_to = "../src/ipc/bindings.ts"
)]
pub trait DeepLinkApi {
    #[taurpc(event)]
    #[taurpc(alias = "openGuideRequest")]
    async fn open_guide_request(guide_id: u32, step: OpenGuideStep);
}

#[derive(Clone)]
pub struct DeepLinkApiImpl;

#[taurpc::resolvers]
impl DeepLinkApi for DeepLinkApiImpl {}

fn get_guide_current_step(app: &AppHandle, guide_id: u32) -> Result<Option<u32>, Error> {
    let conf = Conf::get(app)?;

    let profile = conf
        .profiles
        .iter()
        .find(|p| p.id == conf.profile_in_use)
        .ok_or_else(|| Error::Conf(ConfError::GetProfileInUse))?;

    let progress = profile.progresses.iter().find(|p| p.id == guide_id);

    match progress {
        Some(progress) => {
            debug!(
                "[DeepLink] Found progress for guide {}: current_step = {}",
                guide_id, progress.current_step
            );
            Ok(Some(progress.current_step))
        }
        None => {
            debug!(
                "[DeepLink] No progress found for guide {}, defaulting to step default",
                guide_id
            );
            Ok(None)
        }
    }
}

pub fn handle_deep_link_url(app: AppHandle, url: &tauri::Url) -> Result<(), Error> {
    debug!("[DeepLink] Handling URL: {}", url);

    let url_str = url.as_str();
    let guide_open_regex = Regex::new(r"ganymede://guides/open/(\d+)(?:\?step=(\d+))?")
        .map_err(|e| Error::ParseUrl(e.to_string()))?;

    if let Some(captures) = guide_open_regex.captures(url_str) {
        let guide_id_str = captures
            .get(1)
            .ok_or_else(|| Error::ParseUrl("Missing guide ID".to_string()))?
            .as_str();

        let guide_id = guide_id_str
            .parse::<u32>()
            .map_err(|_| Error::InvalidGuideId(guide_id_str.to_string()))?;

        let current_guide_step = get_guide_current_step(&app, guide_id)?;

        let step = match captures.get(2) {
            Some(step_match) => {
                let step_str = step_match.as_str();
                step_str
                    .parse::<u32>()
                    .map(|s| OpenGuideStep {
                        step: s,
                        progression_step: current_guide_step,
                    })
                    .map_err(|_| Error::ParseUrl(format!("Invalid step: {}", step_str)))?
            }
            None => {
                debug!("[DeepLink] No step provided, calculating from progress");
                OpenGuideStep {
                    step: current_guide_step.unwrap_or(0),
                    progression_step: current_guide_step,
                }
            }
        };

        debug!(
            "[DeepLink] Parsed deep link - guide_id: {}, step: {:?}",
            guide_id, step
        );

        let event_trigger = DeepLinkApiEventTrigger::new(app);
        if let Err(e) = event_trigger.open_guide_request(guide_id, step) {
            warn!(
                "[DeepLink] Failed to emit open_guide_request event: {:?}",
                e
            );
        }

        Ok(())
    } else {
        warn!(
            "[DeepLink] URL does not match expected pattern: {}",
            url_str
        );
        Err(Error::ParseUrl(format!(
            "URL does not match expected pattern: {}",
            url_str
        )))
    }
}
