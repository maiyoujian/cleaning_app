mod cleaner;

#[tauri::command]
async fn run_rust_cleaner(file_path: String, rules_json: String) -> Result<String, String> {
    cleaner::process_and_preview(&file_path, &rules_json)
}

#[tauri::command]
async fn export_rust_cleaner(file_path: String, rules_json: String, export_path: String) -> Result<String, String> {
    cleaner::process_and_export(&file_path, &rules_json, &export_path)
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, run_rust_cleaner, export_rust_cleaner])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
