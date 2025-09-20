use crate::api::DOFUSDB_API;
use crate::item::Item;
use crate::quest::get_quest_data;
use chrono::prelude::*;
use chrono_tz::Europe::Paris;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_http::reqwest;

use crate::conf::ConfLang;

const REWARD_REDUCED_SCALE: f32 = 0.7;
const REWARD_SCALE_CAP: f32 = 1.5;

#[derive(Debug, Serialize, thiserror::Error, taurpc::specta::Type)]
#[specta(rename = "AlmanaxError")]
pub enum Error {
    #[error("failed to get almanax data from DofusDb")]
    DofusDbAlmanaxMalformed(#[from] crate::json::Error),
    #[error("failed to get item data from DofusDb")]
    DofusDbItemMalformed(crate::json::Error),
    #[error("failed to request almanax data: {0}")]
    RequestAlmanax(String),
    #[error("failed to request almanax content: {0}")]
    RequestAlmanaxContent(String),
    #[error("failed to request item data: {0}")]
    RequestItem(String),
    #[error("failed to request item content: {0}")]
    RequestItemContent(String),
    #[error("failed to get conf")]
    Conf(#[from] crate::conf::Error),
    #[error("failed to get quest")]
    Quest(#[from] crate::quest::Error),
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AlmanaxDesc {
    en: String,
    es: String,
    fr: String,
    pt: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Almanax {
    id: u32,
    desc: AlmanaxDesc,
}

impl Almanax {
    pub fn description(&self, lang: ConfLang) -> &str {
        match lang {
            ConfLang::En => self.desc.en.as_str(),
            ConfLang::Es => self.desc.es.as_str(),
            ConfLang::Fr => self.desc.fr.as_str(),
            ConfLang::Pt => self.desc.pt.as_str(),
        }
    }
}

#[derive(Debug)]
#[taurpc::ipc_type]
pub struct AlmanaxReward {
    pub name: String,
    pub quantity: u32,
    pub kamas: u32,
    pub experience: u32,
    pub bonus: String,
    pub img: Option<String>,
}

pub fn get_kamas_reward(
    actual_player_level: u32,
    level_max: i32,
    optimal_level: u32,
    kamas_ratio: f32,
    duration: f32,
    kamas_scale_with_player_level: bool,
) -> u32 {
    let player_level = if level_max == -1 && kamas_scale_with_player_level {
        actual_player_level
    } else {
        level_max as u32
    };

    let level = if kamas_scale_with_player_level {
        player_level
    } else {
        optimal_level
    };

    let reward: f32 = (level.pow(2) + 20 * level - 20) as f32 * kamas_ratio * duration;

    reward as u32
}

pub fn get_fixe_experience_reward(level: u32, duration: f32, experience_ratio: f32) -> u32 {
    let level_pow = (100 + 2 * level).pow(2);

    let reward: f32 = level as f32 * ((level_pow / 20) as f32 * duration * experience_ratio);

    reward as u32
}

pub fn get_experience_reward(
    actual_player_level: u32,
    optimal_level: u32,
    experience_ratio: f32,
    duration: f32,
) -> u32 {
    if actual_player_level > optimal_level {
        let reward_level =
            (actual_player_level as f32).min(optimal_level as f32 * REWARD_SCALE_CAP) as u32;
        let fixe_optimal_level_experience_reward =
            get_fixe_experience_reward(optimal_level, duration, experience_ratio);
        let fixe_level_experience_reward =
            get_fixe_experience_reward(reward_level, duration, experience_ratio);
        let reduced_optimal_experience_reward =
            (1.0 - REWARD_REDUCED_SCALE) * fixe_optimal_level_experience_reward as f32;
        let reduced_experience_reward = REWARD_REDUCED_SCALE * fixe_level_experience_reward as f32;

        (reduced_optimal_experience_reward + reduced_experience_reward) as u32
    } else {
        get_fixe_experience_reward(actual_player_level, duration, experience_ratio)
    }
}

pub async fn get_almanax_data(
    date: String,
    http_client: &reqwest::Client,
) -> Result<Almanax, Error> {
    let date = DateTime::parse_from_rfc3339(date.as_str())
        .unwrap()
        .with_timezone(&Paris);
    let day = date.day();
    let month = date.month();
    let year = date.year();
    let res = http_client
        .get(format!(
            "{}/almanax?date={}/{}/{}",
            DOFUSDB_API, month, day, year
        ))
        .send()
        .await
        .map_err(|err| Error::RequestAlmanax(err.to_string()))?;

    let text = res
        .text()
        .await
        .map_err(|err| Error::RequestAlmanaxContent(err.to_string()))?;

    let almanax =
        crate::json::from_str::<Almanax>(text.as_str()).map_err(Error::DofusDbAlmanaxMalformed)?;

    Ok(almanax)
}

pub async fn get_item_data(item_id: u32, http_client: &reqwest::Client) -> Result<Item, Error> {
    let res = http_client
        .get(format!("{}/items/{}", DOFUSDB_API, item_id))
        .send()
        .await
        .map_err(|err| Error::RequestItem(err.to_string()))?;

    let text = res
        .text()
        .await
        .map_err(|err| Error::RequestItemContent(err.to_string()))?;

    let item = crate::json::from_str::<Item>(text.as_str()).map_err(Error::DofusDbItemMalformed)?;

    Ok(item)
}

#[taurpc::procedures(path = "almanax", export_to = "../src/ipc/bindings.ts")]
pub trait AlmanaxApi {
    async fn get<R: Runtime>(
        app_handle: AppHandle<R>,
        level: u32,
        date: String,
    ) -> Result<AlmanaxReward, Error>;
}

#[derive(Clone)]
pub struct AlmanaxApiImpl;

#[taurpc::resolvers]
impl AlmanaxApi for AlmanaxApiImpl {
    async fn get<R: Runtime>(
        self,
        app: AppHandle<R>,
        level: u32,
        date: String,
    ) -> Result<AlmanaxReward, Error> {
        let http_client = app.state::<reqwest::Client>();
        let almanax = get_almanax_data(date, &http_client).await?;
        let quest = get_quest_data(almanax.id, &http_client)
            .await
            .map_err(Error::Quest)?;
        let item_id = quest.data[0].steps[0].objectives[0].need.generated.items[0];
        let quantity = quest.data[0].steps[0].objectives[0]
            .need
            .generated
            .quantities[0];
        let item = get_item_data(item_id, &http_client).await?;
        let conf = crate::conf::get_conf(&app).map_err(Error::Conf)?;

        let name = match conf.lang {
            crate::conf::ConfLang::En => item.name.en,
            crate::conf::ConfLang::Es => item.name.es,
            crate::conf::ConfLang::Fr => item.name.fr,
            crate::conf::ConfLang::Pt => item.name.pt,
        };

        let experience = get_experience_reward(
            level,
            quest.optimal_level(),
            quest.experience_ratio(),
            quest.duration(),
        );

        let kamas = get_kamas_reward(
            level,
            quest.level_max(),
            quest.optimal_level(),
            quest.kamas_ratio(),
            quest.duration(),
            quest.kamas_scale_with_player_level(),
        );

        let bonus = almanax.description(conf.lang);

        Ok(AlmanaxReward {
            name,
            quantity,
            kamas,
            experience,
            bonus: bonus.to_string(),
            img: item.img,
        })
    }
}
