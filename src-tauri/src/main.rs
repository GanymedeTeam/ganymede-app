// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tokio::main]
async fn main() {
    #[cfg(debug_assertions)]
    std::panic::set_hook(Box::new(|info| {
        eprintln!("💥 PANIC: {info}");

        std::thread::park();
    }));

    ganymede_app_lib::run()
}
