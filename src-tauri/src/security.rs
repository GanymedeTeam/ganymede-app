const VALID_LINKS: [&'static str; 33] = [
    "https://dofuspourlesnoobs.com",
    "https://www.dofuspourlesnoobs.com",
    "https://huzounet.fr",
    "https://dofusbook.net",
    "https://www.dofusbook.net",
    "https://ganymede-app.com",
    "https://ganymede-dofus.com",
    "https://dofus-portals.fr",
    "https://youtube.com",
    "https://www.youtube.com",
    "https://youtu.be",
    "https://twitter.com",
    "https://x.com",
    "https://dofus.com",
    "https://www.dofus.com",    
    "https://www.twitch.tv",
    "https://twitch.tv",
    "https://metamob.fr",
    "https://dofusdb.fr",
    "https://barbofus.com",
    "https://dofensive.com",
    "https://www.dofuskin.com",
    "https://dofuskin.com",
    "https://docs.google.com",
    "https://dofustool.com",
    "https://www.dofustool.com",
    "https://krosmoz.com",
    "https://www.krosmoz.com",
    "https://gamosaurus.com",
    "https://www.gamosaurus.com",
    "https://comteharebourg.com",
    "https://www.comteharebourg.com",
    "https://d-bk.net"
];

#[taurpc::procedures(path = "security", export_to = "../src/ipc/bindings.ts")]
pub trait SecurityApi {
    #[taurpc(alias = "getWhiteList")]
    async fn get_white_list() -> Result<Vec<String>, ()>;
}

#[derive(Clone)]
pub struct SecurityApiImpl;

#[taurpc::resolvers]
impl SecurityApi for SecurityApiImpl {
    async fn get_white_list(self) -> Result<Vec<String>, ()> {
        Ok(VALID_LINKS.to_vec().iter().map(|s| s.to_string()).collect())
    }
}
