mod build_artifact;
mod deploy;
mod execution;
mod external;
mod project;
mod project_detection;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            deploy::check_server_connection,
            deploy::run_local_deploy,
            execution::run_local_build,
            external::open_external_url,
            project::scan_project,
            project::scan_project_ai_context,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
