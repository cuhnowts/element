use crate::ai::types::{AiError, CompletionRequest, TaskScaffold};

pub fn build_scaffold_request(
    title: &str,
    project_name: Option<&str>,
    description: &str,
    context: &str,
) -> CompletionRequest {
    let system = r#"You are a task planning assistant. Given a task title and optional context, generate a structured scaffold. Respond with valid JSON only, no markdown wrapping.

JSON schema:
{
  "description": "detailed task description",
  "steps": ["step 1", "step 2", ...],
  "priority": "urgent|high|medium|low",
  "estimated_minutes": 30,
  "tags": ["tag1", "tag2"],
  "related_tasks": ["task name 1", "task name 2"]
}

Keep descriptions actionable and concise. Steps should be concrete actions.
Priority should reflect complexity and urgency implied by the title.
Estimate duration realistically (most tasks: 30-120 minutes).
Related tasks are suggestions for tasks that would naturally precede, follow, or complement this one."#;

    let user = format!(
        "Task title: {}\nProject: {}\nExisting description: {}\nExisting context: {}",
        title,
        project_name.unwrap_or("(none)"),
        if description.is_empty() {
            "(none)"
        } else {
            description
        },
        if context.is_empty() {
            "(none)"
        } else {
            context
        },
    );

    CompletionRequest {
        system_prompt: system.to_string(),
        user_message: user,
        max_tokens: 1024,
        temperature: 0.3,
    }
}

pub fn parse_scaffold_response(content: &str) -> Result<TaskScaffold, AiError> {
    // Try direct JSON parse
    if let Ok(scaffold) = serde_json::from_str::<TaskScaffold>(content) {
        return Ok(scaffold);
    }

    // Try extracting JSON from markdown code blocks
    let re = regex::Regex::new(r"```(?:json)?\s*\n?([\s\S]*?)\n?```")
        .map_err(|e| AiError::Parse(format!("Regex error: {}", e)))?;

    if let Some(caps) = re.captures(content) {
        if let Some(json_str) = caps.get(1) {
            if let Ok(scaffold) = serde_json::from_str::<TaskScaffold>(json_str.as_str()) {
                return Ok(scaffold);
            }
        }
    }

    // Fallback: return scaffold with just description set to raw content
    Ok(TaskScaffold {
        description: Some(content.to_string()),
        steps: None,
        priority: None,
        estimated_minutes: None,
        tags: None,
        related_tasks: None,
    })
}
