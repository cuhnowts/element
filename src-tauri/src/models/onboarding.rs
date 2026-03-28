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

/// Project state derived from task data (D-01, D-02)
#[derive(Debug, Clone, PartialEq)]
pub enum ProjectState {
    NoPlan,
    Planned,
    InProgress,
    Complete,
}

/// Phase classification for token budget rollup (D-04)
#[derive(Debug, PartialEq)]
enum PhaseClass {
    Completed,
    Active,
    Future,
}

const SOFT_TOKEN_BUDGET: usize = 2000;

/// Detect project state from task data (CTX-01)
pub fn detect_project_state(data: &ProjectContextData) -> ProjectState {
    if data.phases.is_empty() && data.total_tasks == 0 {
        return ProjectState::NoPlan;
    }
    if data.total_tasks > 0 && data.completed_tasks == data.total_tasks {
        return ProjectState::Complete;
    }
    if data.in_progress_tasks > 0 {
        return ProjectState::InProgress;
    }
    if data.total_tasks > 0 {
        return ProjectState::Planned;
    }
    // Edge case: phases exist but no tasks
    ProjectState::NoPlan
}

/// Get tier+state-specific instruction text (CTX-04)
pub fn get_instructions(state: &ProjectState, tier: &str) -> &'static str {
    match (state, tier) {
        (ProjectState::NoPlan, "quick") => "Describe what you need done. I'll create a simple task list.",
        (ProjectState::NoPlan, "medium") => "Let's break this into phases. What are the major deliverables?",
        (ProjectState::NoPlan, "full") => "This project uses GSD workflow. Run /gsd:new-project to begin.",
        (ProjectState::Planned, "quick") => "You have a task list below. Pick one and start working on it.",
        (ProjectState::Planned, "medium") => "Review the phases below. Start with the first incomplete phase. Ask if you need clarification.",
        (ProjectState::Planned, "full") => "This project uses GSD workflow. Run /gsd:progress to see status. Run /gsd:next to continue.",
        (ProjectState::InProgress, "quick") => "You have a simple task list. Check off items as you complete them.",
        (ProjectState::InProgress, "medium") => "Review the phases below. Focus on the current phase. Ask if you need clarification.",
        (ProjectState::InProgress, "full") => "This project uses GSD workflow. Run /gsd:progress to see status. Run /gsd:next to continue.",
        (ProjectState::Complete, _) => "All tasks are complete. Consider marking this project as done, or add follow-up work if needed.",
        _ => "Review the tasks below and continue working.",
    }
}

fn estimate_tokens(text: &str) -> usize {
    text.len() / 4
}

fn classify_phase(phase: &PhaseContextData) -> PhaseClass {
    if phase.total > 0 && phase.completed == phase.total {
        PhaseClass::Completed
    } else if phase.tasks.iter().any(|t| t.status == "in-progress") {
        PhaseClass::Active
    } else {
        PhaseClass::Future
    }
}

fn classify_phases(phases: &[PhaseContextData]) -> Vec<PhaseClass> {
    let mut classes: Vec<PhaseClass> = phases.iter().map(classify_phase).collect();
    // If none are Active, promote first Future to Active
    if !classes.contains(&PhaseClass::Active) {
        if let Some(pos) = classes.iter().position(|c| *c == PhaseClass::Future) {
            classes[pos] = PhaseClass::Active;
        }
    }
    classes
}

fn status_icon(status: &str) -> &'static str {
    match status {
        "complete" => "[x]",
        "in-progress" => "[~]",
        "blocked" => "[!]",
        _ => "[ ]",
    }
}

fn format_phase_rollup(phase: &PhaseContextData, class: &PhaseClass) -> String {
    match class {
        PhaseClass::Completed => {
            format!("- {} [{}/{} complete]\n", phase.name, phase.completed, phase.total)
        }
        PhaseClass::Active => {
            let mut out = format!("### {} [{}/{}]\n\n", phase.name, phase.completed, phase.total);
            for task in &phase.tasks {
                out.push_str(&format!("- {} {}\n", status_icon(&task.status), task.title));
            }
            out
        }
        PhaseClass::Future => {
            format!("- {} [{} tasks]\n", phase.name, phase.total)
        }
    }
}

fn tier_display(tier: &str) -> &'static str {
    match tier {
        "quick" => "Quick",
        "medium" => "Medium",
        "full" => "GSD",
        _ => "Quick",
    }
}

fn state_display(state: &ProjectState) -> &'static str {
    match state {
        ProjectState::NoPlan => "No plan",
        ProjectState::Planned => "Planned",
        ProjectState::InProgress => "In progress",
        ProjectState::Complete => "Complete",
    }
}

fn truncate_description(desc: &str) -> String {
    if desc.len() <= 500 {
        return desc.to_string();
    }
    // Find last ". " before 500 chars
    if let Some(pos) = desc[..500].rfind(". ") {
        format!("{}...", &desc[..pos + 1])
    } else {
        // No sentence boundary found, just truncate at 500
        format!("{}...", &desc[..500])
    }
}

fn build_skill_section(cli_tool: &str, tier: &str) -> String {
    format!(
        r#"## About Element

Element is a desktop workflow orchestration platform -- a personal work OS that
organizes work into themes, projects, phases, and tasks. It structures your work
top-down from high-level goals to actionable items, and orchestrates execution
through external AI tools rather than executing directly.

### Your Role

You are working inside Element, launched via `{cli_tool}`. This project's context has been seeded below. The project uses the **{tier}** planning tier.

You can help by:
- Planning work (breaking down goals into phases and tasks)
- Working on tasks (writing code, documentation, configuration)
- Answering questions about the project's current state

---

"#,
        cli_tool = cli_tool,
        tier = tier_display(tier),
    )
}

fn build_header(data: &ProjectContextData, tier: &str, state: &ProjectState) -> String {
    let mut out = format!("# {}\n\n", data.project_name);

    if !data.project_description.is_empty() {
        out.push_str(&truncate_description(&data.project_description));
        out.push_str("\n\n");
    }

    out.push_str(&format!("**Tier:** {}\n", tier_display(tier)));
    out.push_str(&format!("**State:** {}\n", state_display(state)));

    if *state != ProjectState::NoPlan {
        out.push_str(&format!(
            "**Progress:** {}/{} tasks complete across {} phases\n",
            data.completed_tasks, data.total_tasks, data.phases.len()
        ));
    }

    out.push('\n');
    out
}

fn build_instructions(state: &ProjectState, tier: &str) -> String {
    format!("## Instructions\n\n{}\n\n", get_instructions(state, tier))
}

fn build_attention_section(data: &ProjectContextData, state: &ProjectState) -> String {
    if *state == ProjectState::NoPlan {
        return String::new();
    }

    let mut out = String::from("## What Needs Attention\n\n");
    let mut attention: Vec<&TaskContextData> = Vec::new();

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
    out
}

fn build_work_section(data: &ProjectContextData, _state: &ProjectState) -> String {
    let classes = classify_phases(&data.phases);
    let mut out = String::from("## Current Work\n\n");

    // First pass: normal rollup
    for (phase, class) in data.phases.iter().zip(classes.iter()) {
        out.push_str(&format_phase_rollup(phase, class));
    }

    // Include unassigned tasks if any
    if !data.unassigned_tasks.is_empty() {
        out.push_str("\n### Unassigned Tasks\n\n");
        for task in &data.unassigned_tasks {
            out.push_str(&format!("- {} {}\n", status_icon(&task.status), task.title));
        }
    }

    // Check budget -- progressive collapse
    if estimate_tokens(&out) > SOFT_TOKEN_BUDGET {
        out = String::from("## Current Work\n\n");
        let classes = classify_phases(&data.phases);
        for (phase, class) in data.phases.iter().zip(classes.iter()) {
            if class == &PhaseClass::Active {
                out.push_str(&format_phase_rollup(phase, &PhaseClass::Active));
            } else {
                out.push_str(&format!("- {} [{}/{} complete]\n",
                    phase.name, phase.completed, phase.total));
            }
        }
    }

    out.push('\n');
    out
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

/// Generate context file content for seeding into an AI CLI tool
pub fn generate_context_file_content(data: &ProjectContextData, tier: &str, cli_tool: &str) -> String {
    let state = detect_project_state(data);
    let mut out = String::new();

    // Section 0: Skill section (About Element)
    out.push_str(&build_skill_section(cli_tool, tier));

    // Section 1: Header
    out.push_str(&build_header(data, tier, &state));

    // Section 2: Instructions (tier+state matrix)
    out.push_str(&build_instructions(&state, tier));

    // Section 3: What Needs Attention (preserved from Phase 11)
    out.push_str(&build_attention_section(data, &state));

    // Section 4: Current Work (with token budget rollup)
    if state != ProjectState::NoPlan {
        out.push_str(&build_work_section(data, &state));
    }

    // Section 5: Output contract (Quick/Medium only, NoPlan state only per D-10/D-13)
    if tier != "full" && state == ProjectState::NoPlan {
        out.push_str(&output_contract_section());
    }

    out
}

/// Parse and validate a plan output file
pub fn parse_plan_output_file(content: &str) -> Result<PlanOutput, String> {
    serde_json::from_str::<PlanOutput>(content)
        .map_err(|e| format!("Invalid plan output JSON: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper to build test ProjectContextData
    fn make_test_data(
        name: &str,
        description: &str,
        phases: Vec<PhaseContextData>,
        unassigned: Vec<TaskContextData>,
    ) -> ProjectContextData {
        let total_tasks: usize = phases.iter().map(|p| p.total).sum::<usize>()
            + unassigned.len();
        let completed_tasks: usize = phases.iter().map(|p| p.completed).sum::<usize>()
            + unassigned.iter().filter(|t| t.status == "complete").count();
        let in_progress_tasks: usize = phases.iter()
            .flat_map(|p| p.tasks.iter())
            .chain(unassigned.iter())
            .filter(|t| t.status == "in-progress")
            .count();
        let is_empty = phases.is_empty() && total_tasks == 0;

        ProjectContextData {
            project_name: name.into(),
            project_description: description.into(),
            phases,
            unassigned_tasks: unassigned,
            total_tasks,
            completed_tasks,
            in_progress_tasks,
            is_empty,
        }
    }

    fn make_phase(name: &str, tasks: Vec<(&str, &str)>) -> PhaseContextData {
        let completed = tasks.iter().filter(|(_, s)| *s == "complete").count();
        let total = tasks.len();
        PhaseContextData {
            name: name.into(),
            sort_order: 0,
            tasks: tasks.into_iter().map(|(title, status)| TaskContextData {
                title: title.into(),
                status: status.into(),
                description: String::new(),
            }).collect(),
            completed,
            total,
        }
    }

    // === State Detection Tests (CTX-01) ===

    #[test]
    fn test_state_no_plan_empty() {
        let data = make_test_data("Test", "", vec![], vec![]);
        assert_eq!(detect_project_state(&data), ProjectState::NoPlan);
    }

    #[test]
    fn test_state_no_plan_phases_but_no_tasks() {
        // Phases exist but have no tasks -- still NoPlan per D-01
        let data = ProjectContextData {
            project_name: "Test".into(),
            project_description: "".into(),
            phases: vec![PhaseContextData {
                name: "Empty Phase".into(),
                sort_order: 0,
                tasks: vec![],
                completed: 0,
                total: 0,
            }],
            unassigned_tasks: vec![],
            total_tasks: 0,
            completed_tasks: 0,
            in_progress_tasks: 0,
            is_empty: false,
        };
        assert_eq!(detect_project_state(&data), ProjectState::NoPlan);
    }

    #[test]
    fn test_state_planned() {
        let data = make_test_data("Test", "", vec![
            make_phase("Phase 1", vec![("Task A", "pending"), ("Task B", "pending")]),
        ], vec![]);
        assert_eq!(detect_project_state(&data), ProjectState::Planned);
    }

    #[test]
    fn test_state_planned_blocked_only() {
        let data = make_test_data("Test", "", vec![
            make_phase("Phase 1", vec![("Task A", "blocked"), ("Task B", "pending")]),
        ], vec![]);
        assert_eq!(detect_project_state(&data), ProjectState::Planned);
    }

    #[test]
    fn test_state_in_progress() {
        let data = make_test_data("Test", "", vec![
            make_phase("Phase 1", vec![("Task A", "complete"), ("Task B", "in-progress")]),
        ], vec![]);
        assert_eq!(detect_project_state(&data), ProjectState::InProgress);
    }

    #[test]
    fn test_state_complete() {
        let data = make_test_data("Test", "", vec![
            make_phase("Phase 1", vec![("Task A", "complete"), ("Task B", "complete")]),
        ], vec![]);
        assert_eq!(detect_project_state(&data), ProjectState::Complete);
    }

    // === Instruction Matrix Tests (CTX-04) ===

    #[test]
    fn test_instructions_no_plan_quick() {
        assert_eq!(
            get_instructions(&ProjectState::NoPlan, "quick"),
            "Describe what you need done. I'll create a simple task list."
        );
    }

    #[test]
    fn test_instructions_no_plan_medium() {
        assert_eq!(
            get_instructions(&ProjectState::NoPlan, "medium"),
            "Let's break this into phases. What are the major deliverables?"
        );
    }

    #[test]
    fn test_instructions_gsd() {
        let instr = get_instructions(&ProjectState::NoPlan, "full");
        assert!(instr.contains("/gsd:new-project"));
    }

    #[test]
    fn test_instructions_planned_quick() {
        assert_eq!(
            get_instructions(&ProjectState::Planned, "quick"),
            "You have a task list below. Pick one and start working on it."
        );
    }

    #[test]
    fn test_instructions_planned_medium() {
        assert!(get_instructions(&ProjectState::Planned, "medium").contains("first incomplete phase"));
    }

    #[test]
    fn test_instructions_planned_gsd() {
        let instr = get_instructions(&ProjectState::Planned, "full");
        assert!(instr.contains("/gsd:progress"));
        assert!(instr.contains("/gsd:next"));
    }

    #[test]
    fn test_instructions_in_progress_quick() {
        assert_eq!(
            get_instructions(&ProjectState::InProgress, "quick"),
            "You have a simple task list. Check off items as you complete them."
        );
    }

    #[test]
    fn test_instructions_in_progress_medium() {
        assert!(get_instructions(&ProjectState::InProgress, "medium").contains("current phase"));
    }

    #[test]
    fn test_instructions_in_progress_gsd() {
        let instr = get_instructions(&ProjectState::InProgress, "full");
        assert!(instr.contains("/gsd:progress"));
    }

    #[test]
    fn test_instructions_complete_all_tiers_same() {
        let quick = get_instructions(&ProjectState::Complete, "quick");
        let medium = get_instructions(&ProjectState::Complete, "medium");
        let full = get_instructions(&ProjectState::Complete, "full");
        assert_eq!(quick, medium);
        assert_eq!(medium, full);
        assert!(quick.contains("All tasks are complete"));
    }

    // === Phase Classification Tests ===

    #[test]
    fn test_classify_phase_completed() {
        let phase = make_phase("Done", vec![("T1", "complete"), ("T2", "complete")]);
        assert_eq!(classify_phase(&phase), PhaseClass::Completed);
    }

    #[test]
    fn test_classify_phase_active() {
        let phase = make_phase("Active", vec![("T1", "complete"), ("T2", "in-progress")]);
        assert_eq!(classify_phase(&phase), PhaseClass::Active);
    }

    #[test]
    fn test_classify_phase_future() {
        let phase = make_phase("Future", vec![("T1", "pending"), ("T2", "pending")]);
        assert_eq!(classify_phase(&phase), PhaseClass::Future);
    }

    #[test]
    fn test_classify_phases_promotes_first_future() {
        let phases = vec![
            make_phase("Done", vec![("T1", "complete")]),
            make_phase("Next", vec![("T1", "pending")]),
            make_phase("Later", vec![("T1", "pending")]),
        ];
        let classes = classify_phases(&phases);
        assert_eq!(classes, vec![PhaseClass::Completed, PhaseClass::Active, PhaseClass::Future]);
    }

    // === Token Budget Tests (CTX-02) ===

    #[test]
    fn test_estimate_tokens() {
        assert_eq!(estimate_tokens("hello world"), 11 / 4); // 2
    }

    #[test]
    fn test_token_budget_large_project() {
        // Build 12 completed phases + 1 active + 2 future
        let mut phases = Vec::new();
        for i in 0..12 {
            phases.push(make_phase(
                &format!("Completed Phase {}", i + 1),
                (0..5).map(|j| (Box::leak(format!("Task {}", j).into_boxed_str()) as &str, "complete")).collect(),
            ));
        }
        phases.push(make_phase(
            "Active Phase",
            vec![("Current Task", "in-progress"), ("Next Task", "pending")],
        ));
        phases.push(make_phase("Future Phase 1", vec![("F1", "pending"), ("F2", "pending")]));
        phases.push(make_phase("Future Phase 2", vec![("F3", "pending")]));

        let data = make_test_data("Big Project", "A large project", phases, vec![]);

        let output = generate_context_file_content(&data, "medium", "claude");

        // Completed phases should be one-line summaries, not full task listings
        assert!(output.contains("Completed Phase 1 [5/5 complete]"));
        assert!(output.contains("Completed Phase 10 [5/5 complete]"));
        // Active phase should have task details
        assert!(output.contains("### Active Phase"));
        assert!(output.contains("Current Task"));
        // Should NOT list individual tasks for completed phases
        assert!(!output.contains("- [x] Task 0\n- [x] Task 1\n- [x] Task 2"));
    }

    #[test]
    fn test_progressive_collapse() {
        // Build a project large enough to exceed 2000 tokens
        let mut phases = Vec::new();
        for i in 0..20 {
            let tasks: Vec<(&str, &str)> = (0..10)
                .map(|j| {
                    (
                        Box::leak(format!("Very Long Task Name Number {} in Phase {}", j, i).into_boxed_str()) as &str,
                        if i < 15 { "complete" } else { "pending" },
                    )
                })
                .collect();
            phases.push(make_phase(
                &format!("Phase {} With A Reasonably Long Name", i + 1),
                tasks,
            ));
        }
        // Make one phase active
        phases[16] = make_phase(
            "The Active Phase",
            vec![("Active Task 1", "in-progress"), ("Active Task 2", "pending")],
        );

        let data = make_test_data("Huge Project", "Description", phases, vec![]);
        let output = generate_context_file_content(&data, "medium", "claude");

        // The output should contain Current Work section
        assert!(output.contains("## Current Work"));
        // Active phase should still have task listing
        assert!(output.contains("Active Task 1"));
    }

    // === Full Content Generation Tests ===

    #[test]
    fn test_content_no_plan_quick() {
        let data = make_test_data("My App", "A cool app", vec![], vec![]);
        let output = generate_context_file_content(&data, "quick", "claude");

        assert!(output.contains("# My App"));
        assert!(output.contains("**Tier:** Quick"));
        assert!(output.contains("**State:** No plan"));
        assert!(output.contains("## Instructions"));
        assert!(output.contains("simple task list"));
        assert!(output.contains("## Output Contract"));
        assert!(output.contains("plan-output.json"));
    }

    #[test]
    fn test_content_no_plan_gsd_no_output_contract() {
        let data = make_test_data("GSD Project", "", vec![], vec![]);
        let output = generate_context_file_content(&data, "full", "claude");

        assert!(output.contains("# GSD Project"));
        assert!(output.contains("**Tier:** GSD"));
        assert!(output.contains("/gsd:new-project"));
        assert!(!output.contains("## Output Contract"));
    }

    #[test]
    fn test_content_in_progress_medium() {
        let data = make_test_data("Active Project", "Working on it", vec![
            make_phase("Setup", vec![("Init", "complete"), ("Config", "complete")]),
            make_phase("Core", vec![("Build API", "in-progress"), ("Build UI", "pending")]),
        ], vec![]);

        let output = generate_context_file_content(&data, "medium", "claude");

        assert!(output.contains("## What Needs Attention"));
        assert!(output.contains("## Current Work"));
        assert!(output.contains("**Progress:** 2/4 tasks complete across 2 phases"));
        assert!(!output.contains("## Output Contract"));
    }

    #[test]
    fn test_content_complete() {
        let data = make_test_data("Done Project", "", vec![
            make_phase("Only Phase", vec![("Task 1", "complete"), ("Task 2", "complete")]),
        ], vec![]);

        let output = generate_context_file_content(&data, "quick", "claude");

        assert!(output.contains("**State:** Complete"));
        assert!(output.contains("All tasks are complete"));
        assert!(output.contains("All tasks complete!"));
        assert!(!output.contains("## Output Contract"));
    }

    #[test]
    fn test_output_contract_gsd_excluded() {
        let data = make_test_data("GSD", "", vec![], vec![]);
        let output = generate_context_file_content(&data, "full", "claude");
        assert!(!output.contains("## Output Contract"));
    }

    #[test]
    fn test_output_contract_quick_no_plan_included() {
        let data = make_test_data("Quick", "", vec![], vec![]);
        let output = generate_context_file_content(&data, "quick", "claude");
        assert!(output.contains("## Output Contract"));
    }

    #[test]
    fn test_output_contract_not_rendered_in_progress() {
        let data = make_test_data("Project", "", vec![
            make_phase("P1", vec![("T1", "in-progress")]),
        ], vec![]);
        let output = generate_context_file_content(&data, "quick", "claude");
        assert!(!output.contains("## Output Contract"));
    }

    #[test]
    fn test_output_contract_not_rendered_planned() {
        let data = make_test_data("Project", "", vec![
            make_phase("P1", vec![("T1", "pending")]),
        ], vec![]);
        let output = generate_context_file_content(&data, "quick", "claude");
        assert!(!output.contains("## Output Contract"));
    }

    #[test]
    fn test_long_description_truncated() {
        let long_desc = "This is a sentence. ".repeat(30); // ~600 chars
        let data = make_test_data("Proj", &long_desc, vec![], vec![]);
        let output = generate_context_file_content(&data, "quick", "claude");

        // Should be truncated with "..."
        assert!(output.contains("..."));
        // Should not contain the full description
        assert!(!output.contains(&long_desc));
    }

    // === Updated existing tests ===

    #[test]
    fn test_context_file_populated_project() {
        let data = ProjectContextData {
            project_name: "My App".into(),
            project_description: "A cool application".into(),
            phases: vec![
                PhaseContextData {
                    name: "Setup".into(),
                    sort_order: 0,
                    tasks: vec![
                        TaskContextData {
                            title: "Init repo".into(),
                            status: "complete".into(),
                            description: "".into(),
                        },
                        TaskContextData {
                            title: "Configure CI".into(),
                            status: "complete".into(),
                            description: "".into(),
                        },
                    ],
                    completed: 2,
                    total: 2,
                },
                PhaseContextData {
                    name: "Core Features".into(),
                    sort_order: 1,
                    tasks: vec![
                        TaskContextData {
                            title: "Build API".into(),
                            status: "complete".into(),
                            description: "".into(),
                        },
                        TaskContextData {
                            title: "Build UI".into(),
                            status: "in-progress".into(),
                            description: "".into(),
                        },
                        TaskContextData {
                            title: "Add tests".into(),
                            status: "pending".into(),
                            description: "".into(),
                        },
                    ],
                    completed: 1,
                    total: 3,
                },
            ],
            unassigned_tasks: vec![],
            total_tasks: 5,
            completed_tasks: 3,
            in_progress_tasks: 1,
            is_empty: false,
        };

        let output = generate_context_file_content(&data, "quick", "claude");

        assert!(output.contains("# My App"));
        assert!(output.contains("3/5 tasks complete"));
        assert!(output.contains("Setup"));
        assert!(output.contains("Core Features"));
        assert!(output.contains("## What Needs Attention"));
        assert!(output.contains("**Build UI**"));
        assert!(output.contains("## Current Work"));
    }

    #[test]
    fn test_context_file_empty_project() {
        let data = ProjectContextData {
            project_name: "New Project".into(),
            project_description: "Starting fresh".into(),
            phases: vec![],
            unassigned_tasks: vec![],
            total_tasks: 0,
            completed_tasks: 0,
            in_progress_tasks: 0,
            is_empty: true,
        };

        let output = generate_context_file_content(&data, "quick", "claude");

        assert!(output.contains("# New Project"));
        assert!(output.contains("## Instructions"));
        assert!(output.contains("plan-output.json"));
        assert!(!output.contains("## Current Work"));
    }

    // === Skill Section Tests (Phase 16) ===

    #[test]
    fn test_skill_section_contains_about_element() {
        let output = build_skill_section("claude", "quick");
        assert!(output.contains("## About Element"), "Missing '## About Element' heading");
    }

    #[test]
    fn test_skill_section_contains_product_description() {
        let output = build_skill_section("claude", "quick");
        assert!(output.contains("themes"), "Missing 'themes'");
        assert!(output.contains("projects"), "Missing 'projects'");
        assert!(output.contains("phases"), "Missing 'phases'");
        assert!(output.contains("tasks"), "Missing 'tasks'");
    }

    #[test]
    fn test_skill_section_contains_role_framing() {
        let output = build_skill_section("claude", "quick");
        assert!(output.contains("Your Role"), "Missing 'Your Role'");
        assert!(output.contains("Element"), "Missing 'Element'");
        assert!(output.contains("context has been seeded"), "Missing 'context has been seeded'");
    }

    #[test]
    fn test_skill_section_dynamic_cli_tool() {
        let output_aider = build_skill_section("aider", "quick");
        assert!(output_aider.contains("aider"), "aider not found in output");
        let output_codex = build_skill_section("codex", "medium");
        assert!(output_codex.contains("codex"), "codex not found in output");
    }

    #[test]
    fn test_skill_section_dynamic_tier() {
        let output_full = build_skill_section("claude", "full");
        assert!(output_full.contains("GSD"), "Missing 'GSD' for full tier");
        let output_quick = build_skill_section("claude", "quick");
        assert!(output_quick.contains("Quick"), "Missing 'Quick' for quick tier");
    }

    #[test]
    fn test_skill_section_tier_invariant() {
        let quick = build_skill_section("claude", "quick");
        let medium = build_skill_section("claude", "medium");
        let full = build_skill_section("claude", "full");
        // Replace tier display names to compare the rest
        let quick_normalized = quick.replace("Quick", "TIER");
        let medium_normalized = medium.replace("Medium", "TIER");
        let full_normalized = full.replace("GSD", "TIER");
        assert_eq!(quick_normalized, medium_normalized, "quick vs medium differ beyond tier name");
        assert_eq!(medium_normalized, full_normalized, "medium vs full differ beyond tier name");
    }

    #[test]
    fn test_skill_section_ordering() {
        let data = make_test_data("ProjectName", "desc", vec![], vec![]);
        let output = generate_context_file_content(&data, "quick", "claude");
        let about_pos = output.find("## About Element").expect("Missing ## About Element");
        let header_pos = output.find("# ProjectName").expect("Missing # ProjectName");
        assert!(about_pos < header_pos, "## About Element must come before # ProjectName");
    }

    #[test]
    fn test_skill_section_all_states() {
        // NoPlan
        let data_noplan = make_test_data("P", "", vec![], vec![]);
        let out_noplan = generate_context_file_content(&data_noplan, "quick", "claude");
        assert!(out_noplan.contains("## About Element"), "Missing in NoPlan");

        // Planned
        let data_planned = make_test_data("P", "", vec![
            make_phase("Ph1", vec![("T1", "pending")]),
        ], vec![]);
        let out_planned = generate_context_file_content(&data_planned, "quick", "claude");
        assert!(out_planned.contains("## About Element"), "Missing in Planned");

        // InProgress
        let data_ip = make_test_data("P", "", vec![
            make_phase("Ph1", vec![("T1", "in-progress")]),
        ], vec![]);
        let out_ip = generate_context_file_content(&data_ip, "medium", "claude");
        assert!(out_ip.contains("## About Element"), "Missing in InProgress");

        // Complete
        let data_complete = make_test_data("P", "", vec![
            make_phase("Ph1", vec![("T1", "complete")]),
        ], vec![]);
        let out_complete = generate_context_file_content(&data_complete, "full", "claude");
        assert!(out_complete.contains("## About Element"), "Missing in Complete");
    }

    #[test]
    fn test_skill_section_token_budget() {
        let output = build_skill_section("claude", "quick");
        let tokens = estimate_tokens(&output);
        assert!(tokens <= 500, "Skill section exceeds 500 token budget: {} tokens", tokens);
    }

    #[test]
    fn test_skill_section_no_collapse() {
        // Even for a large project, the skill section should be fully present
        let mut phases = Vec::new();
        for i in 0..20 {
            let tasks: Vec<(&str, &str)> = (0..10)
                .map(|j| {
                    (
                        Box::leak(format!("Task {} in Phase {}", j, i).into_boxed_str()) as &str,
                        if i < 15 { "complete" } else { "pending" },
                    )
                })
                .collect();
            phases.push(make_phase(
                &format!("Phase {} Long Name", i + 1),
                tasks,
            ));
        }
        phases[16] = make_phase("Active", vec![("Active Task", "in-progress")]);
        let data = make_test_data("Big", "desc", phases, vec![]);
        let output = generate_context_file_content(&data, "medium", "claude");
        assert!(output.contains("## About Element"), "Skill section collapsed for large project");
        // Check full content is there
        assert!(output.contains("Your Role"), "Role section collapsed for large project");
    }

    #[test]
    fn test_context_file_no_unassigned_tasks() {
        let data = ProjectContextData {
            project_name: "Organized Project".into(),
            project_description: "Everything is in phases".into(),
            phases: vec![PhaseContextData {
                name: "Phase 1".into(),
                sort_order: 0,
                tasks: vec![TaskContextData {
                    title: "Task A".into(),
                    status: "pending".into(),
                    description: "".into(),
                }],
                completed: 0,
                total: 1,
            }],
            unassigned_tasks: vec![],
            total_tasks: 1,
            completed_tasks: 0,
            in_progress_tasks: 0,
            is_empty: false,
        };

        let output = generate_context_file_content(&data, "quick", "claude");

        assert!(!output.contains("Unassigned Tasks"));
        assert!(output.contains("## Current Work"));
    }
}
