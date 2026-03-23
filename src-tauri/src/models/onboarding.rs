use serde::{Deserialize, Serialize};

/// Output contract from CLI tool plan generation
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlanOutput {
    pub phases: Vec<PendingPhase>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PendingPhase {
    pub name: String,
    #[serde(default)]
    pub sort_order: Option<i32>,
    pub tasks: Vec<PendingTask>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PendingTask {
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
}

/// Input for batch creating phases and tasks (from review screen)
#[derive(Debug, Deserialize)]
pub struct BatchPlanInput {
    pub phases: Vec<PendingPhaseInput>,
}

#[derive(Debug, Deserialize)]
pub struct PendingPhaseInput {
    pub name: String,
    pub tasks: Vec<PendingTaskInput>,
}

#[derive(Debug, Deserialize)]
pub struct PendingTaskInput {
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
}

/// Generate skill file content for the CLI tool
pub fn generate_skill_file_content(
    project_name: &str,
    scope: &str,
    goals: &str,
) -> String {
    format!(
        r#"# Project Onboarding: {project_name}

## Project Context
- **Name:** {project_name}
- **Scope:** {scope}
- **Goals:** {goals}

## Your Task
You are helping the user plan this project. Have a conversation to understand:
1. What are the major deliverables?
2. What are the technical constraints?
3. What is the priority order?

Ask clarifying questions before generating the plan.

## Output Contract
When the user confirms the plan, write a JSON file to `.element/plan-output.json` with this exact schema:

```json
{{
  "phases": [
    {{
      "name": "Phase name",
      "sort_order": 1,
      "tasks": [
        {{ "title": "Task title", "description": "Optional description" }}
      ]
    }}
  ]
}}
```

IMPORTANT: The output file MUST be valid JSON matching this schema exactly.
"#
    )
}

/// Parse and validate a plan output file
pub fn parse_plan_output_file(content: &str) -> Result<PlanOutput, String> {
    serde_json::from_str::<PlanOutput>(content)
        .map_err(|e| format!("Invalid plan output JSON: {}", e))
}
