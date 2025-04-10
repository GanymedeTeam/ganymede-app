pub enum Event {
    GoToNextGuideStep,
    GoToPreviousGuideStep,
    UpdateStarted,
    UpdateInProgress,
    UpdateFinished,
}

impl Into<&str> for Event {
    fn into(self) -> &'static str {
        match self {
            Event::GoToNextGuideStep => "go-to-next-guide-step",
            Event::GoToPreviousGuideStep => "go-to-previous-guide-step",
            Event::UpdateStarted => "update-started",
            Event::UpdateInProgress => "update-in-progress",
            Event::UpdateFinished => "update-finished",
        }
    }
}
