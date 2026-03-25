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

/// Data structures for project context file generation
pub struct ProjectContextData {
    pub project_name: String,
    pub project_description: String,
    pub phases: Vec<PhaseContextData>,
    pub unassigned_tasks: Vec<TaskContextData>,
    pub total_tasks: usize,
    pub completed_tasks: usize,
    pub in_progress_tasks: usize,
    pub is_empty: bool,
}

pub struct PhaseContextData {
    pub name: String,
    pub sort_order: i32,
    pub tasks: Vec<TaskContextData>,
    pub completed: usize,
    pub total: usize,
}

pub struct TaskContextData {
    pub title: String,
    pub status: String,
    pub description: String,
}

/// Generate context file content for seeding into an AI CLI tool
pub fn generate_context_file_content(data: &ProjectContextData) -> String {
    if data.is_empty {
        generate_empty_project_context(data)
    } else {
        generate_populated_project_context(data)
    }
}

fn generate_populated_project_context(data: &ProjectContextData) -> String {
    let mut out = String::new();

    // Header
    out.push_str(&format!("# Project Context: {}\n\n", data.project_name));

    // Overview
    out.push_str("## Overview\n\n");
    if !data.project_description.is_empty() {
        out.push_str(&format!("{}\n\n", data.project_description));
    }
    let pct = if data.total_tasks > 0 {
        (data.completed_tasks as f64 / data.total_tasks as f64 * 100.0) as usize
    } else {
        0
    };
    out.push_str(&format!(
        "**Progress:** {}/{} tasks complete ({}%)\n\n",
        data.completed_tasks, data.total_tasks, pct
    ));

    // Phases
    out.push_str("## Phases\n\n");
    for phase in &data.phases {
        out.push_str(&format!(
            "### {} [{}/{}]\n\n",
            phase.name, phase.completed, phase.total
        ));
        for task in &phase.tasks {
            let icon = status_icon(&task.status);
            out.push_str(&format!("- {} {} ({})\n", icon, task.title, task.status));
        }
        out.push('\n');
    }

    // Unassigned tasks
    if !data.unassigned_tasks.is_empty() {
        out.push_str("## Unassigned Tasks\n\n");
        for task in &data.unassigned_tasks {
            let icon = status_icon(&task.status);
            out.push_str(&format!("- {} {} ({})\n", icon, task.title, task.status));
        }
        out.push('\n');
    }

    // What needs attention
    out.push_str("## What Needs Attention\n\n");
    let mut attention: Vec<&TaskContextData> = Vec::new();
    // Collect in-progress first, then pending
    let all_tasks: Vec<&TaskContextData> = data
        .phases
        .iter()
        .flat_map(|p| p.tasks.iter())
        .chain(data.unassigned_tasks.iter())
        .collect();
    for task in &all_tasks {
        if task.status == "in-progress" {
            attention.push(task);
        }
    }
    for task in &all_tasks {
        if task.status == "pending" {
            attention.push(task);
        }
    }
    for task in attention.iter().take(5) {
        out.push_str(&format!("- **{}** ({})\n", task.title, task.status));
    }
    if attention.is_empty() {
        out.push_str("All tasks complete!\n");
    }
    out.push('\n');

    // Output contract
    out.push_str(&output_contract_section());

    out
}

fn generate_empty_project_context(data: &ProjectContextData) -> String {
    let mut out = String::new();

    out.push_str(&format!(
        "# Project Onboarding: {}\n\n",
        data.project_name
    ));

    out.push_str("## Project Context\n\n");
    out.push_str(&format!("- **Name:** {}\n", data.project_name));
    if !data.project_description.is_empty() {
        out.push_str(&format!(
            "- **Description:** {}\n",
            data.project_description
        ));
    }
    out.push('\n');

    out.push_str("## Your Task\n");
    out.push_str("You are helping the user plan this project. Have a conversation to understand:\n");
    out.push_str("1. What are the major deliverables?\n");
    out.push_str("2. What are the technical constraints?\n");
    out.push_str("3. What is the priority order?\n\n");
    out.push_str("Ask clarifying questions before generating the plan.\n\n");

    out.push_str(&output_contract_section());

    out
}

fn status_icon(status: &str) -> &'static str {
    match status {
        "complete" => "[x]",
        "in-progress" => "[~]",
        "blocked" => "[!]",
        _ => "[ ]",
    }
}

fn output_contract_section() -> String {
    r#"## Output Contract
When the user confirms the plan, write a JSON file to `.element/plan-output.json` with this exact schema:

```json
{
  "phases": [
    {
      "name": "Phase name",
      "sort_order": 1,
      "tasks": [
        { "title": "Task title", "description": "Optional description" }
      ]
    }
  ]
}
```

IMPORTANT: The output file MUST be valid JSON matching this schema exactly.
"#
    .to_string()
}

/// Parse and validate a plan output file
pub fn parse_plan_output_file(content: &str) -> Result<PlanOutput, String> {
    serde_json::from_str::<PlanOutput>(content)
        .map_err(|e| format!("Invalid plan output JSON: {}", e))
}
