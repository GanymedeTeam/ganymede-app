use serde::{Deserialize, Serialize};

use crate::conf::ConfLang;

#[derive(Serialize, Deserialize, Debug)]
pub struct ItemName {
    pub fr: String,
    pub en: String,
    pub es: String,
    pub pt: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Item {
    pub name: ItemName,
    pub img: Option<String>,
}

impl Item {
    pub fn name(&self, lang: &ConfLang) -> &str {
        match lang {
            ConfLang::En => self.name.en.as_str(),
            ConfLang::Es => self.name.es.as_str(),
            ConfLang::Pt => self.name.pt.as_str(),
            ConfLang::Fr => self.name.fr.as_str(),
        }
    }
}
