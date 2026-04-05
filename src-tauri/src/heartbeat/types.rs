use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskWithDueDate {
    pub id: String,
    pub title: String,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub due_date: NaiveDate,
    pub estimated_minutes: Option<i32>,
    pub is_backlog: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum DeadlineRisk {
    Overdue {
        task: TaskWithDueDate,
    },
    AtRisk {
        task: TaskWithDueDate,
        needed_minutes: i32,
        available_minutes: i32,
        days_remaining: i64,
    },
    NoEstimate {
        task: TaskWithDueDate,
        days_remaining: i64,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RiskSeverity {
    Critical,
    Warning,
    Info,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RiskAssessment {
    pub risks: Vec<DeadlineRisk>,
    pub summary: String,
    pub assessed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HeartbeatConfig {
    pub enabled: bool,
    pub interval_minutes: u64,
    pub provider_id: Option<String>,
}

impl DeadlineRisk {
    pub fn severity(&self) -> RiskSeverity {
        match self {
            DeadlineRisk::Overdue { .. } => RiskSeverity::Critical,
            DeadlineRisk::AtRisk { days_remaining, .. } => {
                if *days_remaining <= 1 {
                    RiskSeverity::Critical
                } else if *days_remaining <= 3 {
                    RiskSeverity::Warning
                } else {
                    RiskSeverity::Info
                }
            }
            DeadlineRisk::NoEstimate { days_remaining, .. } => {
                if *days_remaining <= 1 {
                    RiskSeverity::Critical
                } else if *days_remaining <= 3 {
                    RiskSeverity::Warning
                } else {
                    RiskSeverity::Info
                }
            }
        }
    }

    pub fn task(&self) -> &TaskWithDueDate {
        match self {
            DeadlineRisk::Overdue { task } => task,
            DeadlineRisk::AtRisk { task, .. } => task,
            DeadlineRisk::NoEstimate { task, .. } => task,
        }
    }

    pub fn task_id(&self) -> &str {
        &self.task().id
    }

    pub fn project_id(&self) -> Option<&str> {
        self.task().project_id.as_deref()
    }

    pub fn suggested_fix(&self) -> Option<String> {
        match self {
            DeadlineRisk::Overdue { task } => Some(format!(
                "Reschedule '{}' -- it was due {}",
                task.title, task.due_date
            )),
            DeadlineRisk::AtRisk { task, .. } => Some(format!(
                "Move '{}' to free up time before {}",
                task.title, task.due_date
            )),
            DeadlineRisk::NoEstimate { task, .. } => {
                Some(format!("Add a time estimate to '{}'", task.title))
            }
        }
    }

    fn severity_str(&self) -> &str {
        match self.severity() {
            RiskSeverity::Critical => "critical",
            RiskSeverity::Warning => "warning",
            RiskSeverity::Info => "info",
        }
    }

    pub fn risk_fingerprint(&self, today: NaiveDate) -> String {
        format!("{}_{}_{}", self.task_id(), self.severity_str(), today)
    }
}
