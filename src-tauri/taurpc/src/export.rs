#[cfg(dev)]
use itertools::Itertools;
#[cfg(dev)]
use std::collections::HashMap;
#[cfg(dev)]
use std::fs::OpenOptions;
#[cfg(dev)]
use std::io::prelude::*;
#[cfg(dev)]
use std::path::Path;

#[cfg(dev)]
static PACKAGE_JSON: &str = r#"
{
    "name": ".taurpc",
    "types": "index.ts"
}
"#;

#[cfg(dev)]
static BOILERPLATE_TS_CODE: &str = r#"
import { createTauRPCProxy as createProxy } from "taurpc"

export const createTauRPCProxy = () => createProxy<Router>(ARGS_MAP)
"#;

#[cfg(dev)]
/// Export the generated TS types with the code necessary for generating the client proxy.
///
/// By default, if the `export_to` attribute was not specified on the procedures macro, it will be exported
/// to `node_modules/.taurpc` and a `package.json` will also be generated to import the package.
/// Otherwise the code will just be export to the .ts file specified by the user.
pub(super) fn export_types(
    export_path: Option<&'static str>,
    handlers: Vec<(&'static str, &'static str)>,
    args_map: HashMap<String, String>,
    export_config: specta_typescript::Typescript,
) {
    let export_path = export_path.map(|p| p.to_string()).unwrap_or(
        std::env::current_dir()
            .unwrap()
            .join("../bindings.ts")
            .into_os_string()
            .into_string()
            .unwrap(),
    );
    let path = Path::new(&export_path);

    if path.is_dir() {
        panic!("`export_to` path should be a ts file");
    }

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).unwrap();
    }

    let types = specta_util::export().export(export_config).unwrap();

    #[cfg(dev)]
    println!("Exporting types to: {}", export_path);

    let mut file = OpenOptions::new()
        .truncate(true)
        .write(true)
        .open(path)
        .unwrap();

    file.write_all(types.as_bytes()).unwrap();

    let args_entries: String = args_map
        .iter()
        .map(|(k, v)| format!("'{}':'{}'", k, v))
        .join(", ");
    let router_args = format!("{{{}}}", args_entries);

    file.write_all(format!("const ARGS_MAP = {}", router_args).as_bytes())
        .unwrap();
    file.write_all(BOILERPLATE_TS_CODE.as_bytes()).unwrap();
    file.write_all(generate_router_type(handlers).as_bytes())
        .unwrap();

    if export_path.ends_with("node_modules\\.taurpc\\index.ts") {
        let package_json_path = Path::new(&export_path)
            .parent()
            .map(|path| path.join("package.json"))
            .unwrap();

        std::fs::write(package_json_path, PACKAGE_JSON).unwrap();
    }
}

#[cfg(dev)]
fn generate_router_type(handlers: Vec<(&'static str, &'static str)>) -> String {
    let mut output = String::from("\ntype Router = {\n");

    for (path, handler_name) in handlers {
        output += &format!(
            "\t'{}': [TauRpc{}InputTypes, TauRpc{}OutputTypes],\n",
            path, handler_name, handler_name
        );
    }

    output += "}";
    output
}
