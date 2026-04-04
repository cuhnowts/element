use std::sync::Arc;
use std::sync::Mutex;
use std::time::Duration;

use crate::ai::gateway::AiGateway;
use crate::ai::ollama::OllamaProvider;
use crate::ai::provider::AiProvider;
use crate::ai::types::CompletionRequest;
use crate::db::connection::Database;
use super::types::DeadlineRisk;

/// Build a deterministic (no LLM) summary of deadline risks.
/// Each risk becomes a single line; lines are joined with newlines.
pub fn build_deterministic_summary(risks: &[DeadlineRisk]) -> String {
    risks
        .iter()
        .map(|risk| match risk {
            DeadlineRisk::Overdue { task } => {
                format!("{}: overdue.", task.title)
            }
            DeadlineRisk::AtRisk {
                task,
                needed_minutes,
                available_minutes,
                days_remaining,
            } => {
                let needed_h = *needed_minutes as f64 / 60.0;
                let avail_h = *available_minutes as f64 / 60.0;
                let day_word = if *days_remaining == 1 { "day" } else { "days" };
                format!(
                    "{}: {}h needed, {}h available, due in {} {}.",
                    task.title,
                    format_hours(needed_h),
                    format_hours(avail_h),
                    days_remaining,
                    day_word,
                )
            }
            DeadlineRisk::NoEstimate {
                task,
                days_remaining,
            } => {
                let day_word = if *days_remaining == 1 { "day" } else { "days" };
                format!(
                    "{}: due in {} {} but has no time estimate.",
                    task.title, days_remaining, day_word,
                )
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
}

/// Format hours: show as integer if whole number, otherwise 1 decimal place.
fn format_hours(h: f64) -> String {
    if (h - h.round()).abs() < 0.001 {
        format!("{}", h as i64)
    } else {
        format!("{:.1}", h)
    }
}

/// Build a prompt for the LLM to summarize deadline risks.
fn build_risk_prompt(risks: &[DeadlineRisk]) -> String {
    let risk_data = build_deterministic_summary(risks);
    format!(
        "You are a deadline risk analyst for a task management app.\n\n\
         Summarize these deadline risks in 2-3 sentences. Be direct and actionable. \
         Format: data-first risk assessment followed by one concrete suggestion.\n\n\
         Risk data:\n{}",
        risk_data
    )
}

/// Generate a risk summary using the provider fallback chain:
/// 1. Try Ollama (test_connection with 2s timeout)
/// 2. Try heartbeat-specific provider (from app_settings heartbeat_provider_id)
/// 3. Try CLI provider (from AiGateway)
/// 4. Fall back to deterministic template
///
/// Each step catches errors and falls through to the next.
pub async fn generate_risk_summary(
    risks: &[DeadlineRisk],
    db: Arc<Mutex<Database>>,
) -> String {
    if risks.is_empty() {
        return String::new();
    }

    let prompt = build_risk_prompt(risks);

    // Step 1: Try Ollama
    if let Some(summary) = try_ollama(&prompt).await {
        return summary;
    }

    // Step 2: Try heartbeat-specific provider
    // Scope the DB lock to read settings, then drop before async calls
    let heartbeat_provider = {
        let db_guard = db.lock().unwrap();
        let provider_id = db_guard
            .get_app_setting("heartbeat_provider_id")
            .ok()
            .flatten();
        if let Some(id) = provider_id {
            let gateway = AiGateway::new();
            let configs = gateway.list_providers(&db_guard).ok();
            configs.and_then(|list| {
                list.into_iter()
                    .find(|c| c.id == id)
                    .and_then(|config| gateway.build_provider(&config).ok())
            })
        } else {
            None
        }
    };

    if let Some(provider) = heartbeat_provider {
        if let Some(summary) = try_provider(provider.as_ref(), &prompt).await {
            return summary;
        }
    }

    // Step 3: Try CLI provider
    let cli_provider = {
        let db_guard = db.lock().unwrap();
        let gateway = AiGateway::new();
        gateway.get_cli_provider(&db_guard).ok()
    };

    if let Some(provider) = cli_provider {
        if let Some(summary) = try_provider(provider.as_ref(), &prompt).await {
            return summary;
        }
    }

    // Step 4: Deterministic fallback (always works)
    build_deterministic_summary(risks)
}

/// Try to get a summary from Ollama. Returns None if unavailable or errored.
async fn try_ollama(prompt: &str) -> Option<String> {
    let ollama = OllamaProvider::new(None, "llama3.2:3b".to_string());

    // test_connection has a built-in 2s timeout
    match tokio::time::timeout(Duration::from_secs(3), ollama.test_connection()).await {
        Ok(Ok(true)) => {}
        _ => return None,
    }

    try_provider(&ollama, prompt).await
}

/// Try to get a summary from any AiProvider. Returns None on error.
async fn try_provider(provider: &dyn AiProvider, prompt: &str) -> Option<String> {
    let request = CompletionRequest {
        system_prompt: prompt.to_string(),
        user_message: "Summarize the deadline risks above.".to_string(),
        max_tokens: 256,
        temperature: 0.3,
        tools: None,
        tool_results: None,
    };

    match provider.complete(request).await {
        Ok(response) if !response.content.trim().is_empty() => Some(response.content),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;
    use crate::heartbeat::types::TaskWithDueDate;

    fn make_task(id: &str, title: &str, due: NaiveDate, est: Option<i32>) -> TaskWithDueDate {
        TaskWithDueDate {
            id: id.to_string(),
            title: title.to_string(),
            project_id: None,
            project_name: None,
            due_date: due,
            estimated_minutes: est,
            is_backlog: false,
        }
    }

    #[test]
    fn deterministic_summary_at_risk() {
        let task = make_task("t1", "Write report", NaiveDate::from_ymd_opt(2026, 1, 7).unwrap(), Some(240));
        let risks = vec![DeadlineRisk::AtRisk {
            task,
            needed_minutes: 240,
            available_minutes: 120,
            days_remaining: 2,
        }];

        let summary = build_deterministic_summary(&risks);
        assert_eq!(summary, "Write report: 4h needed, 2h available, due in 2 days.");
    }

    #[test]
    fn deterministic_summary_no_estimate() {
        let task = make_task("t1", "Review PR", NaiveDate::from_ymd_opt(2026, 1, 8).unwrap(), None);
        let risks = vec![DeadlineRisk::NoEstimate {
            task,
            days_remaining: 3,
        }];

        let summary = build_deterministic_summary(&risks);
        assert_eq!(summary, "Review PR: due in 3 days but has no time estimate.");
    }

    #[test]
    fn deterministic_summary_overdue() {
        let task = make_task("t1", "Deploy fix", NaiveDate::from_ymd_opt(2026, 1, 4).unwrap(), Some(60));
        let risks = vec![DeadlineRisk::Overdue { task }];

        let summary = build_deterministic_summary(&risks);
        assert_eq!(summary, "Deploy fix: overdue.");
    }

    #[test]
    fn deterministic_summary_singular_day() {
        let task = make_task("t1", "Quick task", NaiveDate::from_ymd_opt(2026, 1, 6).unwrap(), None);
        let risks = vec![DeadlineRisk::NoEstimate {
            task,
            days_remaining: 1,
        }];

        let summary = build_deterministic_summary(&risks);
        assert_eq!(summary, "Quick task: due in 1 day but has no time estimate.");
    }

    #[test]
    fn deterministic_summary_multiple_risks() {
        let risks = vec![
            DeadlineRisk::Overdue {
                task: make_task("t1", "Deploy fix", NaiveDate::from_ymd_opt(2026, 1, 4).unwrap(), Some(60)),
            },
            DeadlineRisk::AtRisk {
                task: make_task("t2", "Write report", NaiveDate::from_ymd_opt(2026, 1, 7).unwrap(), Some(240)),
                needed_minutes: 240,
                available_minutes: 120,
                days_remaining: 2,
            },
        ];

        let summary = build_deterministic_summary(&risks);
        assert!(summary.contains('\n'));
        let lines: Vec<&str> = summary.lines().collect();
        assert_eq!(lines.len(), 2);
        assert_eq!(lines[0], "Deploy fix: overdue.");
        assert_eq!(lines[1], "Write report: 4h needed, 2h available, due in 2 days.");
    }

    #[test]
    fn risk_prompt_contains_risk_data() {
        let risks = vec![DeadlineRisk::Overdue {
            task: make_task("t1", "Deploy fix", NaiveDate::from_ymd_opt(2026, 1, 4).unwrap(), Some(60)),
        }];

        let prompt = build_risk_prompt(&risks);
        assert!(prompt.contains("deadline risk analyst"));
        assert!(prompt.contains("2-3 sentences"));
        assert!(prompt.contains("Deploy fix: overdue."));
    }
}
