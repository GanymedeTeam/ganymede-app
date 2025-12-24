use std::path::PathBuf;

use serde::{Deserialize, Serialize, Serializer};

#[derive(Debug, Serialize, thiserror::Error, taurpc::specta::Type, Clone)]
#[specta(rename = "JsonError")]
pub enum Error {
    #[error("failed to parse JSON: {0}")]
    Json(String),
    #[error("failed to serialize JSON: {0}")]
    Serialize(String),
}

pub fn from_str<'de, T>(text: &'de str) -> Result<T, Error>
where
    T: Deserialize<'de>,
{
    let des = &mut serde_json::Deserializer::from_str(text);
    serde_path_to_error::deserialize::<_, T>(des).map_err(|err| Error::Json(err.to_string()))
}

pub fn serialize_pretty<T>(value: &T) -> Result<String, Error>
where
    T: Serialize,
{
    serde_json::to_string_pretty(value).map_err(|err| Error::Serialize(err.to_string()))
}

pub fn serialize_path<S>(path: &Option<PathBuf>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match path {
        Some(p) => match get_segments_from_guides(p) {
            Some(segments) => serializer.serialize_str(&segments),
            None => serializer.serialize_none(),
        },
        None => serializer.serialize_none(),
    }
}

fn get_segments_from_guides(path: &PathBuf) -> Option<String> {
    // Convertit le chemin en composants et collecte les segments après "guides"
    let mut components = path.components().peekable();
    let mut found_guides = false;

    let mut result_segments = Vec::new();

    while let Some(component) = components.next() {
        if let Some(segment) = component.as_os_str().to_str() {
            // Déclenche l'enregistrement à partir de "guides"
            if found_guides {
                result_segments.push(segment);
            } else if segment == "guides" {
                found_guides = true;
            }
        }
    }

    // Enlève le dernier segment s'il s'agit d'un fichier
    if let Some(last) = result_segments.last() {
        if PathBuf::from(last).extension().is_some() {
            result_segments.pop(); // Enlève le fichier
        }
    }

    // Construit la chaîne finale si "guides" a été trouvé
    if found_guides && !result_segments.is_empty() {
        Some(result_segments.join("/"))
    } else {
        None // Retourne None si "guides" n'a pas été trouvé ou aucun segment après
    }
}
