use crate::scheduling::types::{CalendarEvent, WorkHoursConfig};
use chrono::NaiveTime;

#[derive(Debug, Clone)]
pub struct OpenBlock {
    pub start: NaiveTime,
    pub end: NaiveTime,
    pub duration_minutes: i32,
}

fn parse_time(s: &str) -> NaiveTime {
    NaiveTime::parse_from_str(s, "%H:%M").unwrap_or(NaiveTime::from_hms_opt(0, 0, 0).unwrap())
}

pub fn find_open_blocks(
    work_hours: &WorkHoursConfig,
    events: &[CalendarEvent],
    buffer_minutes: i32,
    min_block_minutes: i32,
) -> Vec<OpenBlock> {
    let work_start = parse_time(&work_hours.start_time);
    let work_end = parse_time(&work_hours.end_time);
    let buffer = chrono::Duration::minutes(buffer_minutes as i64);

    if work_start >= work_end {
        return vec![];
    }

    // Parse events, clamp to work hours, collect occupied ranges
    let mut occupied: Vec<(NaiveTime, NaiveTime)> = events
        .iter()
        .filter_map(|e| {
            let e_start = parse_time(&e.start_time);
            let e_end = parse_time(&e.end_time);
            // Skip events entirely outside work hours
            if e_end <= work_start || e_start >= work_end {
                return None;
            }
            // Clamp to work hours
            let clamped_start = e_start.max(work_start);
            let clamped_end = e_end.min(work_end);
            if clamped_start >= clamped_end {
                return None;
            }
            // Apply buffer: expand the occupied range
            let buffered_start = if clamped_start - buffer > work_start {
                clamped_start - buffer
            } else {
                work_start
            };
            let buffered_end = if clamped_end + buffer < work_end {
                clamped_end + buffer
            } else {
                work_end
            };
            Some((buffered_start, buffered_end))
        })
        .collect();

    // Sort by start time
    occupied.sort_by_key(|&(s, _)| s);

    // Merge overlapping occupied ranges
    let mut merged: Vec<(NaiveTime, NaiveTime)> = Vec::new();
    for (s, e) in occupied {
        if let Some(last) = merged.last_mut() {
            if s <= last.1 {
                last.1 = last.1.max(e);
                continue;
            }
        }
        merged.push((s, e));
    }

    // Walk timeline from work_start to work_end, collect gaps
    let mut blocks = Vec::new();
    let mut cursor = work_start;

    for (occ_start, occ_end) in &merged {
        if cursor < *occ_start {
            let duration = (*occ_start - cursor).num_minutes() as i32;
            if duration >= min_block_minutes {
                blocks.push(OpenBlock {
                    start: cursor,
                    end: *occ_start,
                    duration_minutes: duration,
                });
            }
        }
        cursor = cursor.max(*occ_end);
    }

    // Final gap after last occupied range
    if cursor < work_end {
        let duration = (work_end - cursor).num_minutes() as i32;
        if duration >= min_block_minutes {
            blocks.push(OpenBlock {
                start: cursor,
                end: work_end,
                duration_minutes: duration,
            });
        }
    }

    blocks
}

#[cfg(test)]
mod tests {
    use super::*;

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
            buffer_minutes: 10,
            min_block_minutes: 30,
        }
    }

    fn event(id: &str, title: &str, start: &str, end: &str) -> CalendarEvent {
        CalendarEvent {
            id: id.to_string(),
            title: title.to_string(),
            start_time: start.to_string(),
            end_time: end.to_string(),
            account_color: None,
        }
    }

    #[test]
    fn no_events_returns_single_full_block() {
        let wh = default_work_hours();
        let blocks = find_open_blocks(&wh, &[], 10, 30);
        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].start, NaiveTime::from_hms_opt(9, 0, 0).unwrap());
        assert_eq!(blocks[0].end, NaiveTime::from_hms_opt(17, 0, 0).unwrap());
        assert_eq!(blocks[0].duration_minutes, 480);
    }

    #[test]
    fn one_event_returns_two_blocks_with_buffer() {
        let wh = default_work_hours();
        let events = vec![event("1", "Meeting", "10:00", "11:00")];
        let blocks = find_open_blocks(&wh, &events, 10, 30);
        assert_eq!(blocks.len(), 2);
        // Before event: 09:00 to 09:50 (50 min, 10 min buffer before event)
        assert_eq!(blocks[0].start, NaiveTime::from_hms_opt(9, 0, 0).unwrap());
        assert_eq!(blocks[0].end, NaiveTime::from_hms_opt(9, 50, 0).unwrap());
        assert_eq!(blocks[0].duration_minutes, 50);
        // After event: 11:10 to 17:00 (350 min, 10 min buffer after event)
        assert_eq!(blocks[1].start, NaiveTime::from_hms_opt(11, 10, 0).unwrap());
        assert_eq!(blocks[1].end, NaiveTime::from_hms_opt(17, 0, 0).unwrap());
        assert_eq!(blocks[1].duration_minutes, 350);
    }

    #[test]
    fn filters_blocks_shorter_than_min() {
        let wh = default_work_hours();
        // Event from 09:10 to 09:40: gap before is 09:00-09:00 (0 min after buffer), too short
        let events = vec![event("1", "Quick", "09:05", "09:40")];
        let blocks = find_open_blocks(&wh, &events, 10, 30);
        // Before: 09:00 to 08:55 (clamped to 09:00, so 0 min) -- filtered
        // After: 09:50 to 17:00 = 430 min
        assert!(blocks.iter().all(|b| b.duration_minutes >= 30));
    }

    #[test]
    fn event_before_work_hours_returns_full_block() {
        let wh = default_work_hours();
        let events = vec![event("1", "Early", "07:00", "08:00")];
        let blocks = find_open_blocks(&wh, &events, 10, 30);
        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].start, NaiveTime::from_hms_opt(9, 0, 0).unwrap());
        assert_eq!(blocks[0].end, NaiveTime::from_hms_opt(17, 0, 0).unwrap());
    }

    #[test]
    fn event_spanning_entire_day_returns_empty() {
        let wh = default_work_hours();
        let events = vec![event("1", "All Day", "08:00", "18:00")];
        let blocks = find_open_blocks(&wh, &events, 10, 30);
        assert!(blocks.is_empty());
    }

    #[test]
    fn overlapping_events_merged() {
        let wh = default_work_hours();
        let events = vec![
            event("1", "Meeting A", "10:00", "11:30"),
            event("2", "Meeting B", "11:00", "12:00"),
        ];
        let blocks = find_open_blocks(&wh, &events, 10, 30);
        // Merged event: 10:00-12:00
        // Before: 09:00-09:50 (50 min)
        // After: 12:10-17:00 (290 min)
        assert_eq!(blocks.len(), 2);
        assert_eq!(blocks[0].end, NaiveTime::from_hms_opt(9, 50, 0).unwrap());
        assert_eq!(blocks[1].start, NaiveTime::from_hms_opt(12, 10, 0).unwrap());
    }
}
