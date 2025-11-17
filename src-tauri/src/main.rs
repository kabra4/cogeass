#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod db;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:cogeass.db", db::get_migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::http::load_spec_from_url,
            commands::http::make_request,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
