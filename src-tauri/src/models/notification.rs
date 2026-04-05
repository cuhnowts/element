use serde::{Deserialize, Serialize};

use crate::db::connection::Database;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Notification {
    pub id: String,
    pub title: String,
    pub body: String,
    pub priority: String,
    pub category: Option<String>,
    pub project_id: Option<String>,
    pub action_url: Option<String>,
    pub read: bool,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNotificationInput {
    pub title: String,
    pub body: String,
    pub priority: String,
    pub category: Option<String>,
    pub project_id: Option<String>,
    pub action_url: Option<String>,
}

impl Database {
    pub fn create_notification(
        &self,
        input: CreateNotificationInput,
    ) -> Result<Notification, rusqlite::Error> {
        let id = uuid::Uuid::new_v4().to_string();
        let created_at = chrono::Utc::now().to_rfc3339();

        self.conn().execute(
            "INSERT INTO notifications (id, title, body, priority, category, project_id, action_url, read, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8)",
            rusqlite::params![
                id,
                input.title,
                input.body,
                input.priority,
                input.category,
                input.project_id,
                input.action_url,
                created_at
            ],
        )?;

        Ok(Notification {
            id,
            title: input.title,
            body: input.body,
            priority: input.priority,
            category: input.category,
            project_id: input.project_id,
            action_url: input.action_url,
            read: false,
            created_at,
        })
    }

    pub fn list_notifications(&self) -> Result<Vec<Notification>, rusqlite::Error> {
        let mut stmt = self.conn().prepare(
            "SELECT id, title, body, priority, category, project_id, action_url, read, created_at FROM notifications ORDER BY created_at DESC LIMIT 100",
        )?;

        let notifications = stmt.query_map([], |row| {
            Ok(Notification {
                id: row.get(0)?,
                title: row.get(1)?,
                body: row.get(2)?,
                priority: row.get(3)?,
                category: row.get(4)?,
                project_id: row.get(5)?,
                action_url: row.get(6)?,
                read: row.get::<_, i32>(7)? != 0,
                created_at: row.get(8)?,
            })
        })?;

        notifications.collect()
    }

    pub fn mark_notification_read(&self, id: &str) -> Result<(), rusqlite::Error> {
        self.conn().execute(
            "UPDATE notifications SET read = 1 WHERE id = ?1",
            rusqlite::params![id],
        )?;
        Ok(())
    }

    pub fn mark_all_notifications_read(&self) -> Result<(), rusqlite::Error> {
        self.conn()
            .execute("UPDATE notifications SET read = 1 WHERE read = 0", [])?;
        Ok(())
    }

    pub fn clear_all_notifications(&self) -> Result<(), rusqlite::Error> {
        self.conn().execute("DELETE FROM notifications", [])?;
        Ok(())
    }

    pub fn prune_notifications(&self, max_count: i64) -> Result<(), rusqlite::Error> {
        self.conn().execute(
            "DELETE FROM notifications WHERE id IN (SELECT id FROM notifications ORDER BY created_at DESC LIMIT -1 OFFSET ?1)",
            rusqlite::params![max_count],
        )?;
        Ok(())
    }

    pub fn get_unread_count(&self) -> Result<i64, rusqlite::Error> {
        self.conn().query_row(
            "SELECT COUNT(*) FROM notifications WHERE read = 0",
            [],
            |row| row.get(0),
        )
    }
}
