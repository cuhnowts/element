use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum BlockType {
    Work,
    Meeting,
    Buffer,
}

impl std::fmt::Display for BlockType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BlockType::Work => write!(f, "work"),
            BlockType::Meeting => write!(f, "meeting"),
            BlockType::Buffer => write!(f, "buffer"),
        }
    }
}

impl BlockType {
    pub fn from_db_str(s: &str) -> Result<Self, String> {
        match s {
            "work" => Ok(BlockType::Work),
            "meeting" => Ok(BlockType::Meeting),
            "buffer" => Ok(BlockType::Buffer),
            _ => Err(format!("Invalid block type: {}", s)),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkHoursConfig {
    pub start_time: String,
    pub end_time: String,
    pub work_days: Vec<String>,
    pub buffer_minutes: i32,
    pub min_block_minutes: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleBlock {
    pub id: String,
    pub schedule_date: String,
    pub block_type: BlockType,
    pub start_time: String,
    pub end_time: String,
    pub task_id: Option<String>,
    pub task_title: Option<String>,
    pub task_priority: Option<String>,
    pub event_title: Option<String>,
    pub is_confirmed: bool,
    pub is_continuation: bool,
}

#[derive(Debug, Clone)]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub start_time: String,  // HH:mm format
    pub end_time: String,    // HH:mm format
    pub account_color: Option<String>,
}

#[derive(Debug, Clone)]
pub struct TaskWithPriority {
    pub id: String,
    pub title: String,
    pub priority: crate::models::task::TaskPriority,
    pub due_date: Option<chrono::NaiveDate>,
    pub estimated_minutes: Option<i32>,
}
