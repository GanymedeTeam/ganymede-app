use crate::api::DOFUSDB_API;
use crate::item::Item;
use crate::quest::get_quest_data;
use chrono::Datelike;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_http::reqwest;

use crate::conf::{Conf, Lang};

const REWARD_REDUCED_SCALE: f32 = 0.7;
const REWARD_SCALE_CAP: f32 = 1.5;
const PLAYER_LEVEL: u32 = 200;

pub enum Error {
    DofusDbAlmanaxMalformed(crate::json::Error),
    DofusDbItemMalformed(crate::json::Error),
    RequestAlmanax(reqwest::Error),
    RequestAlmanaxContent(reqwest::Error),
    RequestItem(reqwest::Error),
    RequestItemContent(reqwest::Error),
    Conf(crate::conf::Error),
    Quest(crate::quest::Error),
}

impl Into<tauri::ipc::InvokeError> for Error {
    fn into(self) -> tauri::ipc::InvokeError {
        match self {
            Error::DofusDbAlmanaxMalformed(err) => tauri::ipc::InvokeError::from(format!(
                "DofusDbAlmanaxMalformed({})",
                err.to_string()
            )),
            Error::DofusDbItemMalformed(err) => {
                tauri::ipc::InvokeError::from(format!("DofusDbItemMalformed({})", err.to_string()))
            }
            Error::RequestAlmanax(err) => {
                tauri::ipc::InvokeError::from(format!("RequestAlmanax({})", err.to_string()))
            }
            Error::RequestAlmanaxContent(err) => {
                tauri::ipc::InvokeError::from(format!("RequestAlmanaxContent({})", err.to_string()))
            }
            Error::RequestItem(err) => {
                tauri::ipc::InvokeError::from(format!("RequestItem({})", err.to_string()))
            }
            Error::RequestItemContent(err) => {
                tauri::ipc::InvokeError::from(format!("RequestItemContent({})", err.to_string()))
            }
            Error::Conf(err) => err.into(),
            Error::Quest(err) => err.into(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AlmanaxName {
    de: String,
    en: String,
    es: String,
    fr: String,
    it: String,
    pt: String,
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
    name: AlmanaxName,
    #[serde(rename = "descId")]
    desc_id: i32,
    desc: AlmanaxDesc,
    #[serde(rename = "npcId")]
    npc_id: i32,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
}

impl Almanax {
    pub fn description(&self, lang: Lang) -> &str {
        match lang {
            Lang::En => self.desc.en.as_str(),
            Lang::Es => self.desc.es.as_str(),
            Lang::Fr => self.desc.fr.as_str(),
            Lang::Pt => self.desc.pt.as_str(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
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

pub async fn get_almanax_data() -> Result<Almanax, Error> {
    let date = chrono::offset::Local::now();
    let day = date.day();
    let month = date.month();
    let year = date.year();
    let res = reqwest::get(format!(
        "{}/almanax?date={}/{}/{}",
        DOFUSDB_API, month, day, year
    ))
    .await
    .map_err(Error::RequestAlmanax)?;

    let text = res.text().await.map_err(Error::RequestAlmanaxContent)?;

    let almanax =
        crate::json::from_str::<Almanax>(text.as_str()).map_err(Error::DofusDbAlmanaxMalformed)?;

    Ok(almanax)
}

pub async fn get_item_data(item_id: u32) -> Result<Item, Error> {
    let res = reqwest::get(format!("{}/items/{}", DOFUSDB_API, item_id))
        .await
        .map_err(Error::RequestItem)?;

    let text = res.text().await.map_err(Error::RequestItemContent)?;

    let item = crate::json::from_str::<Item>(text.as_str()).map_err(Error::DofusDbItemMalformed)?;

    Ok(item)
}

#[tauri::command]
pub async fn get_almanax(app: AppHandle) -> Result<AlmanaxReward, Error> {
    let almanax = get_almanax_data().await?;
    let quest = get_quest_data(almanax.id).await.map_err(Error::Quest)?;
    let item_id = quest.data[0].steps[0].objectives[0].need.generated.items[0];
    let quantity = quest.data[0].steps[0].objectives[0]
        .need
        .generated
        .quantities[0];
    let item = get_item_data(item_id).await?;
    let conf = Conf::get(&app).map_err(Error::Conf)?;

    let name = match conf.lang {
        crate::conf::Lang::En => item.name.en,
        crate::conf::Lang::Es => item.name.es,
        crate::conf::Lang::Fr => item.name.fr,
        crate::conf::Lang::Pt => item.name.pt,
    };

    let experience = get_experience_reward(
        PLAYER_LEVEL,
        quest.optimal_level(),
        quest.experience_ratio(),
        quest.duration(),
    );

    let kamas = get_kamas_reward(
        PLAYER_LEVEL,
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
