use rusqlite::Connection;

pub fn run_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    let version: i32 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;

    if version < 1 {
        conn.execute_batch(include_str!("sql/001_initial.sql"))?;
        conn.pragma_update(None, "user_version", 1)?;
    }

    if version < 2 {
        conn.execute_batch(include_str!("sql/002_execution.sql"))?;
        conn.pragma_update(None, "user_version", 2)?;
    }

    if version < 3 {
        conn.execute_batch(include_str!("sql/003_scheduling.sql"))?;
        conn.pragma_update(None, "user_version", 3)?;
    }

    if version < 4 {
        conn.execute_batch(include_str!("sql/004_workflows.sql"))?;
        conn.pragma_update(None, "user_version", 4)?;
    }

    if version < 5 {
        conn.execute_batch(include_str!("sql/005_plugins_credentials_calendar.sql"))?;
        conn.pragma_update(None, "user_version", 5)?;
    }

    if version < 6 {
        conn.execute_batch(include_str!("sql/006_ai_scheduling.sql"))?;
        conn.pragma_update(None, "user_version", 6)?;
    }

    if version < 7 {
        conn.execute_batch(include_str!("sql/007_themes.sql"))?;
        conn.pragma_update(None, "user_version", 7)?;
    }

    if version < 8 {
        conn.execute_batch(include_str!("sql/008_phases.sql"))?;
        conn.pragma_update(None, "user_version", 8)?;
    }

    if version < 9 {
        conn.execute_batch(include_str!("sql/009_ai_onboarding.sql"))?;
        conn.pragma_update(None, "user_version", 9)?;
    }

    if version < 10 {
        conn.execute_batch(include_str!("sql/010_cli_planning_sync.sql"))?;
        conn.pragma_update(None, "user_version", 10)?;
    }

    if version < 11 {
        conn.execute_batch(include_str!("sql/011_notifications.sql"))?;
        conn.pragma_update(None, "user_version", 11)?;
    }

    if version < 12 {
        conn.execute_batch(include_str!("sql/012_project_goal.sql"))?;
        conn.pragma_update(None, "user_version", 12)?;
    }

    if version < 13 {
        conn.execute_batch(include_str!("sql/013_plugin_mcp_tools.sql"))?;
        conn.pragma_update(None, "user_version", 13)?;
    }

    Ok(())
}
