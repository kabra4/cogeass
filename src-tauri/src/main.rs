#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod db;
mod network;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:cogeass.db", db::get_migrations())
                .build(),
        )
        .manage(network::session::SessionManager::new())
        .invoke_handler(tauri::generate_handler![
            commands::http::load_spec_from_url,
            commands::http::make_request,
            commands::session::open_session,
            commands::session::close_session,
            commands::session::send_message,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
