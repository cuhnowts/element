use chrono::NaiveDate;
use crate::scheduling::types::{ScheduleBlock, BlockType, TaskWithPriority};
use crate::scheduling::time_blocks::OpenBlock;
use crate::models::task::TaskPriority;

pub fn score_task(task: &TaskWithPriority, today: NaiveDate) -> f64 {
    let priority_weight = match task.priority {
        TaskPriority::Urgent => 100.0,
        TaskPriority::High => 75.0,
        TaskPriority::Medium => 50.0,
        TaskPriority::Low => 25.0,
    };

    let due_date_urgency = task.due_date.map_or(0.0, |due| {
        let days_until = (due - today).num_days();
        if days_until < 0 {
            50.0
        } else if days_until == 0 {
            40.0
        } else if days_until <= 3 {
            25.0
        } else if days_until <= 7 {
            10.0
        } else {
            0.0
        }
    });

    priority_weight + due_date_urgency
}

pub fn assign_tasks_to_blocks(
    open_blocks: &[OpenBlock],
    tasks: &[TaskWithPriority],
    schedule_date: &str,
    today: NaiveDate,
) -> Vec<ScheduleBlock> {
    if tasks.is_empty() {
        return vec![];
    }

    // Score and sort tasks descending
    let mut scored: Vec<(&TaskWithPriority, f64)> = tasks
        .iter()
        .map(|t| (t, score_task(t, today)))
        .collect();
    scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    // Track remaining capacity per block: (start_cursor, end, original_index)
    let mut block_capacities: Vec<(chrono::NaiveTime, chrono::NaiveTime)> = open_blocks
        .iter()
        .map(|b| (b.start, b.end))
        .collect();

    let mut result: Vec<ScheduleBlock> = Vec::new();

    for (task, _score) in &scored {
        let estimated = task.estimated_minutes.unwrap_or(30);
        let mut remaining = estimated;
        let mut is_first = true;

        for cap in block_capacities.iter_mut() {
            if remaining <= 0 {
                break;
            }

            let available = (cap.1 - cap.0).num_minutes() as i32;
            if available <= 0 {
                continue;
            }

            let use_minutes = remaining.min(available);
            let block_start = cap.0;
            let block_end = cap.0 + chrono::Duration::minutes(use_minutes as i64);

            result.push(ScheduleBlock {
                id: uuid::Uuid::new_v4().to_string(),
                schedule_date: schedule_date.to_string(),
                block_type: BlockType::Work,
                start_time: block_start.format("%H:%M").to_string(),
                end_time: block_end.format("%H:%M").to_string(),
                task_id: Some(task.id.clone()),
                task_title: Some(task.title.clone()),
                task_priority: Some(task.priority.to_string()),
                event_title: None,
                is_confirmed: false,
                is_continuation: !is_first,
            });

            cap.0 = block_end;
            remaining -= use_minutes;
            is_first = false;
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveTime;

    fn make_task(id: &str, title: &str, priority: TaskPriority, due_date: Option<NaiveDate>, est_min: Option<i32>) -> TaskWithPriority {
        TaskWithPriority {
            id: id.to_string(),
            title: title.to_string(),
            priority,
            due_date,
            estimated_minutes: est_min,
        }
    }

    fn make_block(start_h: u32, start_m: u32, end_h: u32, end_m: u32) -> OpenBlock {
        let start = NaiveTime::from_hms_opt(start_h, start_m, 0).unwrap();
        let end = NaiveTime::from_hms_opt(end_h, end_m, 0).unwrap();
        let duration_minutes = (end - start).num_minutes() as i32;
        OpenBlock { start, end, duration_minutes }
    }

    fn today() -> NaiveDate {
        NaiveDate::from_ymd_opt(2026, 3, 18).unwrap()
    }

    // score_task tests
    #[test]
    fn score_urgent_no_due_date() {
        let task = make_task("1", "T", TaskPriority::Urgent, None, None);
        assert_eq!(score_task(&task, today()), 100.0);
    }

    #[test]
    fn score_high_no_due_date() {
        let task = make_task("1", "T", TaskPriority::High, None, None);
        assert_eq!(score_task(&task, today()), 75.0);
    }

    #[test]
    fn score_medium_no_due_date() {
        let task = make_task("1", "T", TaskPriority::Medium, None, None);
        assert_eq!(score_task(&task, today()), 50.0);
    }

    #[test]
    fn score_low_no_due_date() {
        let task = make_task("1", "T", TaskPriority::Low, None, None);
        assert_eq!(score_task(&task, today()), 25.0);
    }

    #[test]
    fn score_overdue_adds_50() {
        let task = make_task("1", "T", TaskPriority::Medium, Some(NaiveDate::from_ymd_opt(2026, 3, 17).unwrap()), None);
        assert_eq!(score_task(&task, today()), 100.0); // 50 + 50
    }

    #[test]
    fn score_due_today_adds_40() {
        let task = make_task("1", "T", TaskPriority::Medium, Some(today()), None);
        assert_eq!(score_task(&task, today()), 90.0); // 50 + 40
    }

    #[test]
    fn score_due_within_3_days_adds_25() {
        let task = make_task("1", "T", TaskPriority::Medium, Some(NaiveDate::from_ymd_opt(2026, 3, 20).unwrap()), None);
        assert_eq!(score_task(&task, today()), 75.0); // 50 + 25
    }

    #[test]
    fn score_due_this_week_adds_10() {
        let task = make_task("1", "T", TaskPriority::Medium, Some(NaiveDate::from_ymd_opt(2026, 3, 24).unwrap()), None);
        assert_eq!(score_task(&task, today()), 60.0); // 50 + 10
    }

    // assign_tasks_to_blocks tests
    #[test]
    fn assign_no_tasks_returns_empty() {
        let blocks = vec![make_block(9, 0, 17, 0)];
        let result = assign_tasks_to_blocks(&blocks, &[], "2026-03-18", today());
        assert!(result.is_empty());
    }

    #[test]
    fn assign_highest_scored_first() {
        let blocks = vec![make_block(9, 0, 17, 0)];
        let tasks = vec![
            make_task("1", "Low", TaskPriority::Low, None, Some(30)),
            make_task("2", "Urgent", TaskPriority::Urgent, None, Some(30)),
        ];
        let result = assign_tasks_to_blocks(&blocks, &tasks, "2026-03-18", today());
        assert!(!result.is_empty());
        // First assigned block should be the urgent task
        assert_eq!(result[0].task_id, Some("2".to_string()));
    }

    #[test]
    fn assign_splits_task_across_blocks() {
        // Two 60-minute blocks, one 90-minute task
        let blocks = vec![make_block(9, 0, 10, 0), make_block(11, 0, 12, 0)];
        let tasks = vec![make_task("1", "Big Task", TaskPriority::High, None, Some(90))];
        let result = assign_tasks_to_blocks(&blocks, &tasks, "2026-03-18", today());
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].is_continuation, false);
        assert_eq!(result[1].is_continuation, true);
        assert_eq!(result[0].task_id, Some("1".to_string()));
        assert_eq!(result[1].task_id, Some("1".to_string()));
    }

    #[test]
    fn assign_defaults_no_estimate_to_30() {
        let blocks = vec![make_block(9, 0, 17, 0)];
        let tasks = vec![make_task("1", "No Est", TaskPriority::Medium, None, None)];
        let result = assign_tasks_to_blocks(&blocks, &tasks, "2026-03-18", today());
        assert_eq!(result.len(), 1);
        // Block should be 30 minutes (default)
        let start = NaiveTime::from_hms_opt(9, 0, 0).unwrap();
        let end = NaiveTime::from_hms_opt(9, 30, 0).unwrap();
        assert_eq!(result[0].start_time, start.format("%H:%M").to_string());
        assert_eq!(result[0].end_time, end.format("%H:%M").to_string());
    }
}
