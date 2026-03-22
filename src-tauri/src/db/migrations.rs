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

    Ok(())
}
