use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ConfUpdatedPayload {
    pub overlay_mode: bool,
}

pub enum Event {
    GoToNextGuideStep,
    GoToPreviousGuideStep,
    ConfUpdated,
    UpdateStarted,
    UpdateInProgress,
    UpdateFinished,
}

impl Into<&str> for Event {
    fn into(self) -> &'static str {
        match self {
            Event::GoToNextGuideStep => "go-to-next-guide-step",
            Event::GoToPreviousGuideStep => "go-to-previous-guide-step",
            Event::ConfUpdated => "conf-updated",
            Event::UpdateStarted => "update-started",
            Event::UpdateInProgress => "update-in-progress",
            Event::UpdateFinished => "update-finished",
        }
    }
}
