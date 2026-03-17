/// Google Calendar API v3 events list response
pub const GOOGLE_EVENTS_RESPONSE: &str = r#"{
    "kind": "calendar#events",
    "summary": "primary",
    "updated": "2026-03-15T10:00:00.000Z",
    "nextSyncToken": "CLDwv7nI2YYDEAL...",
    "items": [
        {
            "kind": "calendar#event",
            "id": "google-event-001",
            "status": "confirmed",
            "summary": "Team Standup",
            "description": "Daily standup meeting",
            "location": "Conference Room A",
            "start": {
                "dateTime": "2026-03-16T09:00:00-07:00"
            },
            "end": {
                "dateTime": "2026-03-16T09:30:00-07:00"
            },
            "attendees": [
                {"email": "alice@example.com"},
                {"email": "bob@example.com"}
            ]
        },
        {
            "kind": "calendar#event",
            "id": "google-event-002",
            "status": "confirmed",
            "summary": "All Day Workshop",
            "start": {
                "date": "2026-03-17"
            },
            "end": {
                "date": "2026-03-18"
            }
        }
    ]
}"#;

/// Google Calendar incremental sync response (with syncToken)
pub const GOOGLE_INCREMENTAL_RESPONSE: &str = r#"{
    "kind": "calendar#events",
    "nextSyncToken": "CLDwv7nI2YYDEAL_v2...",
    "items": [
        {
            "kind": "calendar#event",
            "id": "google-event-003",
            "status": "confirmed",
            "summary": "New Meeting",
            "start": {
                "dateTime": "2026-03-18T14:00:00-07:00"
            },
            "end": {
                "dateTime": "2026-03-18T15:00:00-07:00"
            }
        }
    ]
}"#;

/// Microsoft Graph Calendar API calendarView response
pub const OUTLOOK_EVENTS_RESPONSE: &str = r#"{
    "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users('...')/calendarView",
    "@odata.deltaLink": "https://graph.microsoft.com/v1.0/me/calendarView/delta?$deltatoken=abc123",
    "value": [
        {
            "id": "outlook-event-001",
            "subject": "Project Review",
            "bodyPreview": "Quarterly project review",
            "start": {
                "dateTime": "2026-03-16T10:00:00.0000000",
                "timeZone": "Pacific Standard Time"
            },
            "end": {
                "dateTime": "2026-03-16T11:00:00.0000000",
                "timeZone": "Pacific Standard Time"
            },
            "location": {
                "displayName": "Building 1, Room 101"
            },
            "attendees": [
                {"emailAddress": {"address": "carol@example.com", "name": "Carol"}},
                {"emailAddress": {"address": "dave@example.com", "name": "Dave"}}
            ],
            "isAllDay": false
        }
    ]
}"#;

/// Empty calendar response (no events)
pub const GOOGLE_EMPTY_RESPONSE: &str = r#"{
    "kind": "calendar#events",
    "nextSyncToken": "empty_token",
    "items": []
}"#;
