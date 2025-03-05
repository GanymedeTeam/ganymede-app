use serde::{Deserialize, Serialize};
use tauri_plugin_http::reqwest;

use crate::api::DOFUSDB_API;

#[derive(Debug, Serialize, thiserror::Error)]
pub enum Error {
    #[error("failed to request quest data: {0}")]
    RequestQuest(String),
    #[error("failed to request quest content: {0}")]
    RequestQuestContent(String),
    #[error("failed to parse quest data")]
    DofusDbQuestMalformed(#[from] crate::json::Error),
}

#[derive(Serialize, Deserialize, Debug)]
pub struct QuestData {
    pub data: Vec<Quest>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Quest {
    pub id: u32,
    pub steps: Vec<QuestStep>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct QuestDescription {
    pub en: String,
    pub es: String,
    pub fr: String,
    pub pt: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct QuestStep {
    pub description: QuestDescription,
    #[serde(rename = "optimalLevel")]
    pub optimal_level: u32,
    pub duration: f32,
    pub objectives: Vec<QuestObjective>,
    pub rewards: Vec<QuestReward>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct QuestReward {
    #[serde(rename = "levelMax")]
    pub level_max: i32,
    #[serde(rename = "kamasRatio")]
    pub kamas_ratio: f32,
    #[serde(rename = "experienceRatio")]
    experience_ratio: f32,
    #[serde(rename = "kamasScaleWithPlayerLevel")]
    pub kamas_scale_with_player_level: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct QuestObjective {
    pub id: u32,
    pub need: QuestNeed,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct QuestNeed {
    pub generated: QuestGenerated,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct QuestGenerated {
    pub dungeons: Vec<u32>,
    pub items: Vec<u32>,
    pub quantities: Vec<u32>,
}

impl QuestData {
    pub fn level_max(&self) -> i32 {
        self.data[0].steps[0].rewards[0].level_max
    }

    pub fn kamas_ratio(&self) -> f32 {
        self.data[0].steps[0].rewards[0].kamas_ratio
    }

    pub fn kamas_scale_with_player_level(&self) -> bool {
        self.data[0].steps[0].rewards[0].kamas_scale_with_player_level
    }

    pub fn optimal_level(&self) -> u32 {
        self.data[0].steps[0].optimal_level
    }

    pub fn duration(&self) -> f32 {
        self.data[0].steps[0].duration
    }

    pub fn experience_ratio(&self) -> f32 {
        self.data[0].steps[0].rewards[0].experience_ratio
    }
}

pub async fn get_quest_data(id: u32, http_client: &reqwest::Client) -> Result<QuestData, Error> {
    let res = http_client
        .get(format!(
            "{}/quests?startCriterion[$regex]=Ad={}",
            DOFUSDB_API, id
        ))
        .send()
        .await
        .map_err(|err| Error::RequestQuest(err.to_string()))?;

    let text = res
        .text()
        .await
        .map_err(|err| Error::RequestQuestContent(err.to_string()))?;

    crate::json::from_str::<QuestData>(text.as_str()).map_err(Error::DofusDbQuestMalformed)
}
