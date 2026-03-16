mod db;
mod models;

use db::connection::Database;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let db = Database::new(app.handle())?;
            app.manage(std::sync::Mutex::new(db));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
