pub enum Event {
    UpdateStarted,
    UpdateInProgress,
    UpdateFinished,
}

impl Into<&str> for Event {
    fn into(self) -> &'static str {
        match self {
            Event::UpdateStarted => "update-started",
            Event::UpdateInProgress => "update-in-progress",
            Event::UpdateFinished => "update-finished",
        }
    }
}
