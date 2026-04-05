use super::types::{DeadlineRisk, TaskWithDueDate};
use crate::scheduling::time_blocks::find_open_blocks;
use crate::scheduling::types::{CalendarEvent, WorkHoursConfig};
use chrono::NaiveDate;
use std::collections::HashMap;

/// Calculate available capacity for each workday in the given date range.
/// Returns a vec of (date, capacity_minutes) tuples for workdays only.
pub fn calculate_daily_capacity(
    work_hours: &WorkHoursConfig,
    events_by_date: &HashMap<NaiveDate, Vec<CalendarEvent>>,
    from: NaiveDate,
    through: NaiveDate,
) -> Vec<(NaiveDate, i32)> {
    let mut result = Vec::new();
    let mut current = from;

    while current <= through {
        let weekday = current.format("%a").to_string().to_lowercase();
        // Only include workdays
        if work_hours.work_days.contains(&weekday) {
            let empty_events = Vec::new();
            let day_events = events_by_date.get(&current).unwrap_or(&empty_events);
            let open_blocks = find_open_blocks(
                work_hours,
                day_events,
                work_hours.buffer_minutes,
                work_hours.min_block_minutes,
            );
            let capacity: i32 = open_blocks.iter().map(|b| b.duration_minutes).sum();
            result.push((current, capacity));
        }
        current = current.succ_opt().unwrap();
    }

    result
}

/// Assess deadline risks for a set of tasks given daily capacity data.
/// Filters out backlog tasks (is_backlog=true, i.e. 999.x phases).
/// Returns risks sorted by severity (Critical first) then days_remaining ascending.
pub fn assess_deadline_risks(
    tasks: &[TaskWithDueDate],
    daily_capacity: &[(NaiveDate, i32)],
    today: NaiveDate,
) -> Vec<DeadlineRisk> {
    let mut risks: Vec<DeadlineRisk> = Vec::new();

    for task in tasks {
        // Filter out backlog tasks per D-05, BEAT-04
        if task.is_backlog {
            continue;
        }

        let days_remaining = (task.due_date - today).num_days();

        if task.due_date < today {
            // Overdue
            risks.push(DeadlineRisk::Overdue { task: task.clone() });
        } else if task.estimated_minutes.is_none() {
            // No estimate
            risks.push(DeadlineRisk::NoEstimate {
                task: task.clone(),
                days_remaining,
            });
        } else {
            // Has estimate -- check if capacity is sufficient
            let needed = task.estimated_minutes.unwrap();
            let available: i32 = daily_capacity
                .iter()
                .filter(|(date, _)| *date >= today && *date <= task.due_date)
                .map(|(_, cap)| cap)
                .sum();

            if needed > available {
                risks.push(DeadlineRisk::AtRisk {
                    task: task.clone(),
                    needed_minutes: needed,
                    available_minutes: available,
                    days_remaining,
                });
            }
        }
    }

    // Sort by severity (Critical < Warning < Info due to Ord derive), then days_remaining
    risks.sort_by(|a, b| {
        let sev_cmp = a.severity().cmp(&b.severity());
        if sev_cmp != std::cmp::Ordering::Equal {
            return sev_cmp;
        }
        // For same severity, sort by days_remaining ascending
        let days_a = match a {
            DeadlineRisk::Overdue { task } => (task.due_date - today).num_days(),
            DeadlineRisk::AtRisk { days_remaining, .. } => *days_remaining,
            DeadlineRisk::NoEstimate { days_remaining, .. } => *days_remaining,
        };
        let days_b = match b {
            DeadlineRisk::Overdue { task } => (task.due_date - today).num_days(),
            DeadlineRisk::AtRisk { days_remaining, .. } => *days_remaining,
            DeadlineRisk::NoEstimate { days_remaining, .. } => *days_remaining,
        };
        days_a.cmp(&days_b)
    });

    risks
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;

    fn make_task(
        id: &str,
        title: &str,
        due: NaiveDate,
        est: Option<i32>,
        is_backlog: bool,
    ) -> TaskWithDueDate {
        TaskWithDueDate {
            id: id.to_string(),
            title: title.to_string(),
            project_id: Some("proj-1".to_string()),
            project_name: Some("Test Project".to_string()),
            due_date: due,
            estimated_minutes: est,
            is_backlog,
        }
    }

    fn default_work_hours() -> WorkHoursConfig {
        WorkHoursConfig {
            start_time: "09:00".to_string(),
            end_time: "17:00".to_string(),
            work_days: vec![
                "mon".into(),
                "tue".into(),
                "wed".into(),
                "thu".into(),
                "fri".into(),
            ],
            buffer_minutes: 0,
            min_block_minutes: 15,
        }
    }

    fn event(id: &str, start: &str, end: &str) -> CalendarEvent {
        CalendarEvent {
            id: id.to_string(),
            title: "Meeting".to_string(),
            start_time: start.to_string(),
            end_time: end.to_string(),
            account_color: None,
        }
    }

    // --- assess_deadline_risks tests ---

    #[test]
    fn at_risk_when_insufficient_capacity() {
        // Task due in 3 days, 4h (240min) estimated, only 60min/day capacity
        let today = NaiveDate::from_ymd_opt(2026, 1, 5).unwrap(); // Monday
        let due = NaiveDate::from_ymd_opt(2026, 1, 8).unwrap(); // Thursday (3 days away)
        let tasks = vec![make_task("t1", "Write report", due, Some(240), false)];

        // 60min capacity per day: Mon(60) + Tue(60) + Wed(60) + Thu(60) = 240 total
        // But needed=240 and available=240 means NOT at risk (need > available).
        // Use 50min/day so available = 200 < 240 needed
        let daily_cap: Vec<(NaiveDate, i32)> = (5..=8)
            .map(|d| (NaiveDate::from_ymd_opt(2026, 1, d).unwrap(), 50))
            .collect();

        let risks = assess_deadline_risks(&tasks, &daily_cap, today);
        assert_eq!(risks.len(), 1);
        match &risks[0] {
            DeadlineRisk::AtRisk {
                needed_minutes,
                available_minutes,
                days_remaining,
                ..
            } => {
                assert_eq!(*needed_minutes, 240);
                assert_eq!(*available_minutes, 200); // 4 days * 50min
                assert_eq!(*days_remaining, 3);
            }
            _ => panic!("Expected AtRisk"),
        }
    }

    #[test]
    fn no_risk_when_sufficient_capacity() {
        // Task due in 3 days, 1h estimated, 8h daily capacity -> no risk
        let today = NaiveDate::from_ymd_opt(2026, 1, 5).unwrap(); // Monday
        let due = NaiveDate::from_ymd_opt(2026, 1, 8).unwrap(); // Thursday
        let tasks = vec![make_task("t1", "Quick task", due, Some(60), false)];

        let daily_cap: Vec<(NaiveDate, i32)> = (5..=8)
            .map(|d| (NaiveDate::from_ymd_opt(2026, 1, d).unwrap(), 480))
            .collect();

        let risks = assess_deadline_risks(&tasks, &daily_cap, today);
        assert!(risks.is_empty(), "Expected no risks but got {:?}", risks);
    }

    #[test]
    fn overdue_task_detected() {
        let today = NaiveDate::from_ymd_opt(2026, 1, 6).unwrap(); // Tuesday
        let due = NaiveDate::from_ymd_opt(2026, 1, 5).unwrap(); // Monday (yesterday)
        let tasks = vec![make_task("t1", "Deploy fix", due, Some(60), false)];
        let daily_cap = vec![];

        let risks = assess_deadline_risks(&tasks, &daily_cap, today);
        assert_eq!(risks.len(), 1);
        match &risks[0] {
            DeadlineRisk::Overdue { task } => {
                assert_eq!(task.id, "t1");
            }
            _ => panic!("Expected Overdue"),
        }
    }

    #[test]
    fn no_estimate_flagged() {
        let today = NaiveDate::from_ymd_opt(2026, 1, 5).unwrap(); // Monday
        let due = NaiveDate::from_ymd_opt(2026, 1, 7).unwrap(); // Wednesday
        let tasks = vec![make_task("t1", "Review PR", due, None, false)];
        let daily_cap = vec![];

        let risks = assess_deadline_risks(&tasks, &daily_cap, today);
        assert_eq!(risks.len(), 1);
        match &risks[0] {
            DeadlineRisk::NoEstimate {
                task,
                days_remaining,
            } => {
                assert_eq!(task.id, "t1");
                assert_eq!(*days_remaining, 2);
            }
            _ => panic!("Expected NoEstimate"),
        }
    }

    #[test]
    fn backlog_tasks_filtered_out() {
        let today = NaiveDate::from_ymd_opt(2026, 1, 5).unwrap();
        let due = NaiveDate::from_ymd_opt(2026, 1, 6).unwrap();
        let tasks = vec![
            make_task("t1", "Backlog item", due, Some(480), true), // is_backlog=true
            make_task("t2", "Real task", due, Some(480), false),   // is_backlog=false
        ];
        let daily_cap = vec![(today, 60), (due, 60)]; // Only 2h total for 8h task

        let risks = assess_deadline_risks(&tasks, &daily_cap, today);
        // Backlog task should be filtered, only real task shows up
        assert_eq!(risks.len(), 1);
        assert_eq!(risks[0].task_id(), "t2");
    }

    #[test]
    fn risks_sorted_by_severity_then_days() {
        let today = NaiveDate::from_ymd_opt(2026, 1, 5).unwrap();
        let tasks = vec![
            make_task(
                "t1",
                "Info risk",
                NaiveDate::from_ymd_opt(2026, 1, 12).unwrap(),
                None,
                false,
            ), // 7 days, Info
            make_task(
                "t2",
                "Overdue",
                NaiveDate::from_ymd_opt(2026, 1, 4).unwrap(),
                Some(60),
                false,
            ), // overdue, Critical
            make_task(
                "t3",
                "Warning risk",
                NaiveDate::from_ymd_opt(2026, 1, 7).unwrap(),
                None,
                false,
            ), // 2 days, Warning
        ];
        let daily_cap = vec![];

        let risks = assess_deadline_risks(&tasks, &daily_cap, today);
        assert_eq!(risks.len(), 3);
        // Critical first, then Warning, then Info
        assert_eq!(risks[0].task_id(), "t2"); // Overdue = Critical
        assert_eq!(risks[1].task_id(), "t3"); // 2 days = Warning
        assert_eq!(risks[2].task_id(), "t1"); // 7 days = Info
    }

    // --- calculate_daily_capacity tests ---

    #[test]
    fn full_capacity_no_events() {
        let wh = default_work_hours();
        let events: HashMap<NaiveDate, Vec<CalendarEvent>> = HashMap::new();
        // Mon-Wed (3 workdays), 8h each = 1440 total
        let from = NaiveDate::from_ymd_opt(2026, 1, 5).unwrap(); // Monday
        let through = NaiveDate::from_ymd_opt(2026, 1, 7).unwrap(); // Wednesday

        let cap = calculate_daily_capacity(&wh, &events, from, through);
        assert_eq!(cap.len(), 3);
        let total: i32 = cap.iter().map(|(_, m)| m).sum();
        assert_eq!(total, 480 * 3); // 8h * 3 days
    }

    #[test]
    fn skips_weekends() {
        let wh = default_work_hours();
        let events: HashMap<NaiveDate, Vec<CalendarEvent>> = HashMap::new();
        // Fri through Mon (Sat+Sun should be skipped)
        let from = NaiveDate::from_ymd_opt(2026, 1, 9).unwrap(); // Friday
        let through = NaiveDate::from_ymd_opt(2026, 1, 12).unwrap(); // Monday

        let cap = calculate_daily_capacity(&wh, &events, from, through);
        assert_eq!(cap.len(), 2); // Only Fri and Mon
        assert_eq!(cap[0].0, NaiveDate::from_ymd_opt(2026, 1, 9).unwrap()); // Fri
        assert_eq!(cap[1].0, NaiveDate::from_ymd_opt(2026, 1, 12).unwrap()); // Mon
    }

    #[test]
    fn events_reduce_capacity() {
        let wh = default_work_hours();
        let monday = NaiveDate::from_ymd_opt(2026, 1, 5).unwrap();
        let mut events: HashMap<NaiveDate, Vec<CalendarEvent>> = HashMap::new();
        // 2h meeting on Monday
        events.insert(monday, vec![event("e1", "10:00", "12:00")]);

        let cap = calculate_daily_capacity(&wh, &events, monday, monday);
        assert_eq!(cap.len(), 1);
        // 8h day - 2h meeting = 6h = 360min (no buffer configured)
        assert_eq!(cap[0].1, 360);
    }

    #[test]
    fn days_without_events_fully_open() {
        let wh = default_work_hours();
        let monday = NaiveDate::from_ymd_opt(2026, 1, 5).unwrap();
        let tuesday = NaiveDate::from_ymd_opt(2026, 1, 6).unwrap();
        let mut events: HashMap<NaiveDate, Vec<CalendarEvent>> = HashMap::new();
        // Only Monday has events
        events.insert(monday, vec![event("e1", "10:00", "12:00")]);

        let cap = calculate_daily_capacity(&wh, &events, monday, tuesday);
        assert_eq!(cap.len(), 2);
        assert_eq!(cap[0].1, 360); // Monday: 6h
        assert_eq!(cap[1].1, 480); // Tuesday: full 8h
    }
}
