use tauri::{
    menu::{Menu, MenuItem, SubmenuBuilder},
    tray::TrayIconBuilder,
    Emitter, Manager,
};
use std::sync::{Arc, Mutex};
use tokio_cron_scheduler::JobScheduler;

mod commands;
mod db;
mod engine;
mod models;
#[cfg(test)]
mod test_fixtures;

use db::connection::Database;
use commands::execution_commands::*;
use commands::project_commands::*;
use commands::schedule_commands::*;
use commands::task_commands::*;
use commands::workflow_commands::*;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Initialize database
            let db = Database::new(app.handle())?;
            let db_arc = Arc::new(Mutex::new(db));
            app.manage(db_arc);

            // Initialize scheduler state (will be populated after async init)
            app.manage(Arc::new(tokio::sync::Mutex::new(None::<JobScheduler>)));

            // Spawn scheduler initialization
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match engine::scheduler::init_scheduler(app_handle).await {
                    Ok(_sched) => { /* Scheduler stored in app state by init_scheduler */ }
                    Err(e) => eprintln!("Failed to init scheduler: {}", e),
                }
            });

            // System tray
            let quit = MenuItem::with_id(app, "quit", "Quit Element", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show Element", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show, &quit])?;

            TrayIconBuilder::new()
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            // Window menu (macOS: first submenu is the app menu)
            let app_menu = SubmenuBuilder::new(app, "Element")
                .about(None)
                .separator()
                .quit()
                .build()?;

            let file_menu = SubmenuBuilder::new(app, "File")
                .text("new-project", "New Project")
                .text("new-task", "New Task")
                .separator()
                .close_window()
                .build()?;

            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            let menu = Menu::with_items(app, &[&app_menu, &file_menu, &edit_menu])?;
            app.set_menu(menu)?;

            app.on_menu_event(move |app_handle, event| {
                match event.id().0.as_str() {
                    "new-project" => {
                        let _ = app_handle.emit("menu-new-project", ());
                    }
                    "new-task" => {
                        let _ = app_handle.emit("menu-new-task", ());
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_project,
            list_projects,
            get_project,
            update_project,
            delete_project,
            create_task,
            list_tasks,
            get_task,
            update_task,
            update_task_status,
            delete_task,
            add_tag_to_task,
            remove_tag_from_task,
            list_tags,
            get_todays_tasks,
            get_task_detail,
            get_execution_history,
            get_execution_logs,
            create_workflow,
            list_workflows,
            get_workflow,
            update_workflow,
            delete_workflow,
            promote_task_to_workflow,
            get_workflow_runs,
            get_step_results,
            run_workflow,
            retry_workflow_step,
            create_schedule,
            get_schedule_for_workflow,
            update_schedule,
            toggle_schedule,
            delete_schedule,
            get_next_run_times,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
