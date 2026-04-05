#[cfg(test)]
pub mod calendar_responses;
#[cfg(test)]
pub mod manifests;

#[cfg(test)]
pub use self::db_setup::{setup_test_db, setup_test_db_raw};

#[cfg(test)]
mod db_setup {
    use crate::db::connection::Database;
    use crate::db::migrations;
    use rusqlite::Connection;

    /// Create an in-memory SQLite database with all migrations applied.
    /// Each call returns a fresh, isolated database instance.
    pub fn setup_test_db() -> Database {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&conn).unwrap();
        Database::from_connection(conn)
    }

    /// Create an in-memory SQLite database returning a raw Connection.
    /// Used by modules (like calendar) that operate on raw connections.
    pub fn setup_test_db_raw() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&conn).unwrap();
        conn
    }
}
