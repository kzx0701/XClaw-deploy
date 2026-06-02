mod deploy;
mod execution;
mod openclaw;
mod openclaw_ai;
mod project;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            deploy::check_server_connection,
            deploy::run_local_deploy,
            execution::run_local_build,
            openclaw::load_local_openclaw_gateway_config,
            openclaw_ai::request_project_ai_review,
            project::scan_project,
            project::scan_project_ai_context
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
