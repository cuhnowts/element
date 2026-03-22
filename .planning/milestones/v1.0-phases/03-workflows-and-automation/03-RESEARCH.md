# Phase 3: Workflows and Automation - Research

**Researched:** 2026-03-15
**Domain:** Workflow engine, cron scheduling, shell/HTTP step execution, workflow builder UI
**Confidence:** HIGH

## Summary

Phase 3 transforms Element from a task management app into a workflow orchestration platform. The core deliverables are: (1) a Rust-side workflow engine that executes multi-step pipelines with BSD-style piping between steps, (2) a cron scheduler that runs workflows on recurring schedules, (3) shell command and HTTP request step executors, and (4) a React workflow builder UI with insert-anywhere step editing, CodeMirror-powered shell editors, and structured HTTP step forms.

The existing codebase provides a solid foundation. Phase 1 established the Tauri IPC pattern (`Mutex<Database>` state, `#[tauri::command]` handlers, `app.emit()` for events), SQLite with rusqlite, and a basic `WorkflowDefinition` model (JSON file-based with `Vec<serde_json::Value>` steps). Phase 2 built the multi-panel layout, execution diagram with `StepItem` components, and output drawer. Phase 3 needs to: evolve the workflow model from untyped JSON steps to strongly-typed step definitions, add new SQLite tables for workflows/schedules/runs, build the workflow execution engine, and create the builder UI.

The Rust ecosystem provides everything needed: `tokio::process::Command` for shell execution, `reqwest` for HTTP calls, `tokio-cron-scheduler` for cron scheduling, and Tauri's event system (`Emitter` trait + channels) for streaming execution progress to the frontend. On the frontend, `@uiw/react-codemirror` wraps CodeMirror 6 for shell editors, and `cronstrue` converts cron expressions to human-readable descriptions.

**Primary recommendation:** Build the workflow engine as a Rust module with typed step definitions, use `tokio-cron-scheduler` for scheduling, `tokio::process::Command` for shell steps, `reqwest` for HTTP steps, and stream all execution events to the frontend via Tauri's `Emitter`. Extend the existing `StepItem` and `ExecutionDiagram` components for the builder UI.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Insert-anywhere step list: "+" buttons between every step allow inserting at any position
- Steps form a linear sequence -- sequential execution only, no parallel groups for v1
- Separate read-only flowchart visualization in the center panel (execution diagram from Phase 2)
- The editable step list and the flowchart are separate views -- list for editing, flowchart for visualization
- Promote manual task to workflow via both: "Automate" button in task detail AND "Convert to workflow" in task list context menu
- Promoting a task creates a new workflow with the task pre-filled as step 1
- Shell command steps use a Monaco-style code editor -- syntax highlighting, multi-line support, power-user feel
- HTTP/API call steps use a structured form: method dropdown, URL field, headers (key-value rows), body (JSON editor)
- Agent/tool/skill assignment via dropdown picker on each step -- for v1, built-in types: shell, HTTP, manual
- Automatic piping: each step's output (stdout for shell, response body for HTTP) becomes the next step's input
- Explicit references like {{step_name.output}} available for non-linear access to prior step outputs
- Quick presets (hourly, daily, weekly, monthly) with an "Advanced" toggle revealing raw cron expression input
- Schedule UI lives inline in the task/workflow detail panel -- toggle "Recurring" on/off, configure cron
- Schedules can be toggled on/off without deleting -- pause/resume preserves the cron configuration
- Next 3 upcoming run times displayed below cron configuration for verification
- Any task or workflow can be scheduled -- not limited to multi-step workflows
- In-process scheduler (Rust backend checks schedules while app is running) -- workflows only run when Element is open
- Catch-up on missed runs: when Element launches, check for missed schedules and run them immediately
- Step-by-step progress indicator on the flowchart diagram: current step highlighted, completed steps show checkmarks, failed steps show X
- On step failure: workflow halts, "Retry step" button appears on the failed step -- user can fix and retry from that point
- "Run now" button on any workflow for manual triggering -- works whether or not a schedule is set
- Timestamped run log: each workflow run logged with start time, per-step timing, output, and success/failure status
- Users can browse past runs and see exactly what happened per step

### Claude's Discretion
- Flowchart rendering library/approach (could be SVG, canvas, or a charting lib)
- Workflow definition file format (YAML/JSON/TOML -- deferred from Phase 1)
- Step editor layout and spacing details
- Error message formatting and presentation
- Keyboard shortcuts for workflow editing
- Loading states during workflow execution

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TASK-05 | User can define multi-step task workflows with execution diagrams | Workflow engine with typed step definitions (Rust), WorkflowBuilder UI component, extended ExecutionDiagram with progress indicators |
| TASK-06 | User can assign agents/tools/skills to task steps | WorkflowExecutorPicker dropdown component, step type enum (Shell/HTTP/Manual), step configuration stored per-step in workflow definition |
| AUTO-01 | User can schedule recurring tasks on cron schedules | tokio-cron-scheduler for in-process scheduling, SQLite schedules table, CronScheduler UI with presets + advanced mode, cronstrue for human-readable preview |
| AUTO-02 | User can promote a manual task to an automated workflow | PromoteButton component ("Automate" / "Convert to Workflow"), Tauri command to create workflow from task, navigation to workflow builder |
| AUTO-03 | User can execute shell commands and CLI tools from tasks | tokio::process::Command for async shell execution, stdout/stderr capture, Tauri Emitter for streaming output, ShellEditor with CodeMirror 6 |
| AUTO-04 | User can make HTTP/API calls as task steps | reqwest for async HTTP client, structured request/response handling, HttpStepForm with method/URL/headers/body fields |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tokio-cron-scheduler | 0.15.x | In-process cron scheduling | Most popular tokio-native cron scheduler, supports async jobs, cron expression parsing via croner, timezone support. 1.5M+ downloads. |
| reqwest | 0.13.x | HTTP client for API call steps | De facto Rust HTTP client (300M+ downloads), async/tokio-native, supports JSON, headers, all HTTP methods, TLS via rustls |
| @uiw/react-codemirror | ^4.x | CodeMirror 6 React wrapper for shell editor | Most popular CM6 React binding, manages view/state lifecycle, supports extensions and themes, well-maintained |
| @codemirror/lang-shell | ^6.x | Shell syntax highlighting | Official CodeMirror shell language support |
| @codemirror/lang-json | ^6.x | JSON syntax highlighting for HTTP body editor | Official CodeMirror JSON language support |
| @codemirror/theme-one-dark | ^6.x | Dark theme matching Element's oklch palette | Standard dark theme for CodeMirror, closest match to existing app theme |
| cronstrue | ^2.x | Human-readable cron expression descriptions | Standard library for cron-to-English translation, zero dependencies, 40M+ downloads |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cron (Rust) | -- | Cron expression parsing for next-run calculation | Already included via tokio-cron-scheduler dependency; use directly for computing "next 3 run times" on the backend |
| tauri-plugin-shell | 2.x | Tauri shell plugin for permission scoping | Optional -- can use tokio::process::Command directly from Rust backend without the plugin. Plugin adds permission-scoped shell access from frontend JS. For Phase 3 where all execution is backend-driven, direct tokio::process is simpler. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tokio-cron-scheduler | Manual tokio::time::interval + cron parsing | More control but re-implements job management, missed-run tracking, and scheduler lifecycle that tokio-cron-scheduler handles |
| reqwest | hyper (direct) | Lower-level, more boilerplate. reqwest wraps hyper with ergonomic API. Only use hyper if reqwest's dependency footprint is a concern. |
| @uiw/react-codemirror | Raw @codemirror/view + useEffect | Full control but requires manual view/state management, cleanup, and React lifecycle handling. The wrapper handles this correctly. |
| cronstrue | Custom cron description | Internationalization, edge cases in cron syntax make this deceptively complex. Don't hand-roll. |

**Installation:**

Rust (add to `src-tauri/Cargo.toml`):
```toml
tokio-cron-scheduler = { version = "0.15", features = ["signal"] }
reqwest = { version = "0.13", features = ["json", "rustls-tls"] }
```

Frontend (npm):
```bash
npm install @uiw/react-codemirror @codemirror/lang-shell @codemirror/lang-json @codemirror/theme-one-dark cronstrue
```

## Architecture Patterns

### Recommended Project Structure

```
src-tauri/src/
  commands/
    mod.rs
    task_commands.rs
    project_commands.rs
    workflow_commands.rs    # NEW: workflow CRUD, run, retry, promote
    schedule_commands.rs   # NEW: schedule CRUD, toggle, list upcoming
  db/
    connection.rs
    migrations.rs
    sql/
      001_initial.sql
      002_workflows.sql    # NEW: workflows, steps, schedules, runs tables
  models/
    workflow.rs            # EXTEND: typed step definitions, execution state
    schedule.rs            # NEW: schedule model, cron helpers
    execution.rs           # NEW: run records, step results
  engine/                  # NEW: workflow execution engine
    mod.rs
    executor.rs            # Pipeline executor, step dispatch
    shell.rs               # Shell command executor
    http.rs                # HTTP request executor
    scheduler.rs           # Cron scheduler integration
  lib.rs                   # Register new commands

src/
  components/
    center/
      ExecutionDiagram.tsx # EXTEND: progress indicators, retry button
      StepItem.tsx         # EXTEND: editable mode, click-to-expand
      WorkflowBuilder.tsx  # NEW: editable step list with insert buttons
      StepEditor.tsx       # NEW: expandable step configuration
      ShellEditor.tsx      # NEW: CodeMirror shell editor
      HttpStepForm.tsx     # NEW: structured HTTP request form
      WorkflowExecutorPicker.tsx  # NEW: step type dropdown
      StepInsertButton.tsx # NEW: "+" insert between steps
      CronScheduler.tsx    # NEW: presets + advanced cron input
      CronPreview.tsx      # NEW: next 3 run times display
      RetryButton.tsx      # NEW: retry failed step
      PromoteButton.tsx    # NEW: "Automate" / "Convert to Workflow"
    output/
      RunHistoryList.tsx   # NEW: past workflow runs
      RunHistoryDetail.tsx # NEW: per-step run breakdown
  stores/
    useWorkflowStore.ts    # NEW: workflow state, execution state
  types/
    workflow.ts            # NEW: workflow, step, schedule types
    execution.ts           # EXTEND: add run history types
  lib/
    tauri-commands.ts      # EXTEND: workflow/schedule/run commands
```

### Pattern 1: Typed Step Definitions (Rust)

**What:** Replace the current `Vec<serde_json::Value>` steps with a strongly-typed enum that the engine can dispatch on.

**When to use:** All workflow definition and execution.

**Example:**
```rust
// src-tauri/src/models/workflow.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum StepDefinition {
    Shell {
        name: String,
        command: String,
        working_dir: Option<String>,
        timeout_ms: Option<u64>,
    },
    Http {
        name: String,
        method: String, // GET, POST, PUT, DELETE, PATCH
        url: String,
        headers: Option<Vec<(String, String)>>,
        body: Option<serde_json::Value>,
        timeout_ms: Option<u64>,
    },
    Manual {
        name: String,
        description: String,
    },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Workflow {
    pub id: String,
    pub task_id: Option<String>,  // linked task, if promoted
    pub name: String,
    pub description: String,
    pub steps: Vec<StepDefinition>,
    pub created_at: String,
    pub updated_at: String,
}
```

### Pattern 2: Pipeline Executor with Document Passing

**What:** Execute steps sequentially, passing each step's output as the next step's input via a `Document` envelope. Support `{{step_name.output}}` template references.

**When to use:** All workflow execution.

**Example:**
```rust
// src-tauri/src/engine/executor.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Document {
    pub content: String,          // Raw output (stdout, response body)
    pub content_type: String,     // "text/plain", "application/json"
    pub metadata: DocumentMeta,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DocumentMeta {
    pub step_name: String,
    pub timestamp: String,
    pub exit_code: Option<i32>,       // Shell steps
    pub status_code: Option<u16>,     // HTTP steps
}

pub struct PipelineExecutor {
    step_outputs: HashMap<String, Document>,
}

impl PipelineExecutor {
    pub async fn execute(
        &mut self,
        workflow: &Workflow,
        app: &tauri::AppHandle,
    ) -> Result<Vec<StepResult>, EngineError> {
        let mut prev_output: Option<Document> = None;
        let mut results = Vec::new();

        for (i, step) in workflow.steps.iter().enumerate() {
            // Emit progress event
            app.emit("workflow-step-started", StepProgress {
                workflow_id: workflow.id.clone(),
                step_index: i,
                step_name: step.name().to_string(),
            }).ok();

            let input = self.resolve_input(&step, &prev_output);
            let result = match step {
                StepDefinition::Shell { command, working_dir, timeout_ms, .. } => {
                    self.execute_shell(command, working_dir.as_deref(), *timeout_ms, &input).await
                }
                StepDefinition::Http { method, url, headers, body, timeout_ms, .. } => {
                    self.execute_http(method, url, headers, body, *timeout_ms, &input).await
                }
                StepDefinition::Manual { .. } => {
                    // Manual steps pause execution -- emit event and wait
                    Ok(Document::manual_pause())
                }
            };

            match result {
                Ok(doc) => {
                    self.step_outputs.insert(step.name().to_string(), doc.clone());
                    prev_output = Some(doc.clone());
                    results.push(StepResult::success(i, doc));
                    app.emit("workflow-step-completed", /* ... */).ok();
                }
                Err(e) => {
                    results.push(StepResult::failure(i, e.to_string()));
                    app.emit("workflow-step-failed", /* ... */).ok();
                    return Err(e); // Halt on failure
                }
            }
        }
        Ok(results)
    }
}
```

### Pattern 3: Template Variable Resolution

**What:** Replace `{{step_name.output}}` references in step commands/URLs with actual outputs from prior steps.

**When to use:** Any step that references another step's output.

**Example:**
```rust
fn resolve_templates(&self, input: &str) -> String {
    let re = regex::Regex::new(r"\{\{(\w+)\.output\}\}").unwrap();
    re.replace_all(input, |caps: &regex::Captures| {
        let step_name = &caps[1];
        self.step_outputs
            .get(step_name)
            .map(|doc| doc.content.clone())
            .unwrap_or_default()
    }).to_string()
}
```

### Pattern 4: Event-Driven Execution Progress

**What:** Stream execution progress from Rust to React via Tauri's `Emitter` trait. Frontend subscribes to events and updates Zustand store reactively.

**When to use:** During all workflow execution.

**Example (frontend):**
```typescript
// src/stores/useWorkflowStore.ts
import { listen } from "@tauri-apps/api/event";

// Subscribe to execution events
listen("workflow-step-started", (event) => {
  useWorkflowStore.getState().setStepRunning(event.payload);
});
listen("workflow-step-completed", (event) => {
  useWorkflowStore.getState().setStepCompleted(event.payload);
});
listen("workflow-step-failed", (event) => {
  useWorkflowStore.getState().setStepFailed(event.payload);
});
```

### Pattern 5: Cron Scheduler with Missed-Run Catch-Up

**What:** Use tokio-cron-scheduler for in-process scheduling. On app launch, compare `last_run_at` with cron expression to detect missed runs and execute them.

**When to use:** Scheduled workflows.

**Example:**
```rust
// src-tauri/src/engine/scheduler.rs
use tokio_cron_scheduler::{JobScheduler, Job};

pub async fn init_scheduler(
    app: AppHandle,
    db: Arc<Mutex<Database>>,
) -> Result<JobScheduler, Box<dyn std::error::Error>> {
    let sched = JobScheduler::new().await?;

    // Load all active schedules from DB
    let schedules = {
        let db = db.lock().unwrap();
        db.list_active_schedules()?
    };

    for schedule in schedules {
        // Check for missed runs
        if let Some(missed) = schedule.missed_since_last_run() {
            // Execute immediately for catch-up
            let app_clone = app.clone();
            let db_clone = db.clone();
            tokio::spawn(async move {
                execute_workflow(&app_clone, &db_clone, &schedule.workflow_id).await;
            });
        }

        // Register recurring job
        let cron_expr = schedule.cron_expression.clone();
        let app_clone = app.clone();
        let db_clone = db.clone();
        let wf_id = schedule.workflow_id.clone();

        sched.add(Job::new_async(cron_expr.as_str(), move |_uuid, _lock| {
            let app = app_clone.clone();
            let db = db_clone.clone();
            let id = wf_id.clone();
            Box::pin(async move {
                execute_workflow(&app, &db, &id).await;
            })
        })?).await?;
    }

    sched.start().await?;
    Ok(sched)
}
```

### Anti-Patterns to Avoid

- **Storing workflow definitions only as JSON files:** The existing `workflow.rs` stores workflows as JSON files on disk. Phase 3 must move workflow metadata (id, name, schedule) into SQLite for queryability, while step definitions can remain JSON-serialized within the DB row. Do NOT keep the file-only approach -- it cannot support scheduling, run history, or efficient queries.

- **Blocking the Mutex during execution:** The existing pattern uses `state.lock()` for database access. Workflow execution can take seconds or minutes. NEVER hold the `Mutex<Database>` lock during step execution. Lock briefly to read/write, then release before executing steps.

- **Frontend-driven execution orchestration:** All execution logic must live in the Rust backend. The frontend sends `invoke("run_workflow", { workflowId })` and receives progress events. It never orchestrates step sequencing.

- **Unscoped shell command execution:** Shell commands must run with a working directory and timeout. Never spawn unbounded processes. Always capture both stdout and stderr.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron expression parsing | Custom cron parser | `tokio-cron-scheduler` (uses `croner` internally) | Cron syntax has edge cases (day-of-week vs day-of-month, L/W flags, timezone). Well-tested parsers handle these. |
| Cron-to-English translation | Custom formatter | `cronstrue` npm package | i18n support, handles all cron variants, zero deps, 40M+ downloads |
| HTTP client | Raw TCP/hyper | `reqwest` | Connection pooling, TLS, redirects, timeouts, cookie handling -- all handled |
| Code editor | Custom textarea with syntax highlighting | `@uiw/react-codemirror` + CodeMirror 6 | Syntax highlighting, line numbers, bracket matching, undo/redo, keyboard shortcuts -- CM6 is 130KB vs Monaco's 2MB |
| Next N cron run times | Custom date math | `croner` crate (Rust) / compute on backend and send to frontend | Cron date arithmetic is notoriously tricky (month lengths, leap years, DST transitions) |
| Process output streaming | Custom polling | Tauri `Emitter` + `listen` | Built into Tauri, handles serialization, supports channels for ordered delivery |

**Key insight:** The execution engine is the custom core IP. Everything around it (scheduling, HTTP, shell, cron parsing, code editing) has battle-tested libraries. Build the pipeline orchestrator; delegate everything else.

## Common Pitfalls

### Pitfall 1: Mutex Starvation During Long Workflow Execution

**What goes wrong:** Holding `Mutex<Database>` while executing a multi-step workflow blocks all other Tauri commands (task CRUD, UI queries) for the duration.
**Why it happens:** The existing Phase 1 pattern is `let db = state.lock()` at the start of every command. Workflow execution naturally follows this pattern but holds the lock for minutes.
**How to avoid:** Clone data out of the mutex immediately. Lock -> read workflow -> unlock -> execute steps -> lock -> write results -> unlock. Use `Arc<Mutex<Database>>` and clone the Arc for the execution task.
**Warning signs:** UI freezes during workflow execution, "could not lock database" errors.

### Pitfall 2: Zombie Shell Processes

**What goes wrong:** Shell commands that hang (infinite loops, waiting for stdin) keep running after the workflow is cancelled or Element closes.
**Why it happens:** `tokio::process::Command` spawns OS processes that outlive the Rust runtime if not explicitly killed.
**How to avoid:** Always set a timeout per step (default 30s, configurable). Use `tokio::time::timeout` wrapping the process wait. On timeout or cancellation, call `child.kill()`. Track spawned PIDs and kill on app shutdown.
**Warning signs:** CPU spikes after cancelled workflows, process count growing in Activity Monitor.

### Pitfall 3: Cron Scheduler State Drift

**What goes wrong:** User adds/removes/toggles schedules in the UI, but the in-memory tokio-cron-scheduler has stale job registrations.
**Why it happens:** Schedules are persisted in SQLite but the scheduler runs in memory. Changes to the DB don't automatically sync to the scheduler.
**How to avoid:** When a schedule is created/updated/deleted/toggled, the Tauri command must both update SQLite AND add/remove/update the in-memory scheduler job. Consider a `refresh_scheduler()` function that reconciles DB state with scheduler state.
**Warning signs:** Schedule changes not taking effect until app restart.

### Pitfall 4: Template Injection in Shell Commands

**What goes wrong:** A prior step's output contains shell metacharacters that get interpreted when interpolated into the next step's command via `{{step_name.output}}`.
**Why it happens:** Naive string interpolation of `{{step_name.output}}` into a shell command string.
**How to avoid:** When piping output to shell steps, pass it as stdin (pipe semantics) rather than string interpolation into the command. For explicit `{{}}` references, escape shell metacharacters or use environment variables.
**Warning signs:** Workflow steps producing unexpected results or errors when upstream output contains special characters.

### Pitfall 5: HTTP Step Timeout vs Cron Schedule Overlap

**What goes wrong:** An HTTP step takes longer than the cron interval, causing overlapping workflow executions.
**Why it happens:** No concurrency guard on workflow execution.
**How to avoid:** Track "currently running" state per workflow. Skip or queue a cron trigger if the workflow is already executing. Store `is_running` flag in the workflow run state.
**Warning signs:** Duplicate entries in run history with overlapping timestamps.

### Pitfall 6: Large Output Accumulation

**What goes wrong:** A shell command produces megabytes of stdout (e.g., `cat` on a large file, verbose build output). This fills memory and creates huge Tauri events.
**Why it happens:** Capturing all stdout into a single String without limits.
**How to avoid:** Cap output per step (e.g., 1MB). Stream output in chunks via Tauri events rather than accumulating in memory. Truncate with a "[output truncated]" marker.
**Warning signs:** Memory growth during workflow execution, slow/frozen UI when viewing run output.

## Code Examples

### Shell Step Execution (Rust)

```rust
// src-tauri/src/engine/shell.rs
use tokio::process::Command;
use tokio::time::{timeout, Duration};
use std::process::Stdio;

pub async fn execute_shell(
    command: &str,
    working_dir: Option<&str>,
    timeout_ms: Option<u64>,
    stdin_input: Option<&str>,
) -> Result<Document, EngineError> {
    let timeout_duration = Duration::from_millis(timeout_ms.unwrap_or(30_000));

    let mut cmd = Command::new("sh");
    cmd.arg("-c").arg(command);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    if let Some(dir) = working_dir {
        cmd.current_dir(dir);
    }

    if stdin_input.is_some() {
        cmd.stdin(Stdio::piped());
    }

    let mut child = cmd.spawn().map_err(|e| EngineError::SpawnFailed(e.to_string()))?;

    // Write stdin if provided (pipe from previous step)
    if let Some(input) = stdin_input {
        if let Some(mut stdin) = child.stdin.take() {
            use tokio::io::AsyncWriteExt;
            stdin.write_all(input.as_bytes()).await.ok();
            drop(stdin); // Close stdin to signal EOF
        }
    }

    let result = timeout(timeout_duration, child.wait_with_output())
        .await
        .map_err(|_| EngineError::Timeout(timeout_duration.as_millis() as u64))?
        .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?;

    let stdout = String::from_utf8_lossy(&result.stdout).to_string();
    let stderr = String::from_utf8_lossy(&result.stderr).to_string();

    if !result.status.success() {
        return Err(EngineError::StepFailed {
            exit_code: result.status.code(),
            stdout,
            stderr,
        });
    }

    Ok(Document {
        content: stdout,
        content_type: "text/plain".to_string(),
        metadata: DocumentMeta {
            step_name: String::new(), // Filled by caller
            timestamp: chrono::Utc::now().to_rfc3339(),
            exit_code: result.status.code(),
            status_code: None,
        },
    })
}
```

### HTTP Step Execution (Rust)

```rust
// src-tauri/src/engine/http.rs
use reqwest::Client;
use tokio::time::{timeout, Duration};

pub async fn execute_http(
    method: &str,
    url: &str,
    headers: &Option<Vec<(String, String)>>,
    body: &Option<serde_json::Value>,
    timeout_ms: Option<u64>,
) -> Result<Document, EngineError> {
    let client = Client::new();
    let timeout_duration = Duration::from_millis(timeout_ms.unwrap_or(30_000));

    let mut request = match method.to_uppercase().as_str() {
        "GET" => client.get(url),
        "POST" => client.post(url),
        "PUT" => client.put(url),
        "DELETE" => client.delete(url),
        "PATCH" => client.patch(url),
        _ => return Err(EngineError::InvalidMethod(method.to_string())),
    };

    if let Some(hdrs) = headers {
        for (key, value) in hdrs {
            request = request.header(key.as_str(), value.as_str());
        }
    }

    if let Some(body_json) = body {
        request = request.json(body_json);
    }

    let response = timeout(timeout_duration, request.send())
        .await
        .map_err(|_| EngineError::Timeout(timeout_duration.as_millis() as u64))?
        .map_err(|e| EngineError::HttpError(e.to_string()))?;

    let status = response.status().as_u16();
    let body_text = response.text().await
        .map_err(|e| EngineError::HttpError(e.to_string()))?;

    // Determine content type from response
    let content_type = if serde_json::from_str::<serde_json::Value>(&body_text).is_ok() {
        "application/json".to_string()
    } else {
        "text/plain".to_string()
    };

    Ok(Document {
        content: body_text,
        content_type,
        metadata: DocumentMeta {
            step_name: String::new(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            exit_code: None,
            status_code: Some(status),
        },
    })
}
```

### SQLite Schema for Workflows and Schedules

```sql
-- src-tauri/src/db/sql/002_workflows.sql

CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    steps_json TEXT NOT NULL DEFAULT '[]',  -- JSON array of StepDefinition
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    cron_expression TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_run_at TEXT,
    next_run_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workflow_runs (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL CHECK(trigger_type IN ('manual', 'scheduled', 'catch-up')),
    status TEXT NOT NULL DEFAULT 'running'
        CHECK(status IN ('running', 'completed', 'failed', 'cancelled')),
    started_at TEXT NOT NULL,
    completed_at TEXT,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS step_results (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
    step_index INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    step_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    input_preview TEXT,      -- Truncated input for display
    output_preview TEXT,     -- Truncated output for display
    output_full TEXT,        -- Full output (may be large)
    error_message TEXT,
    duration_ms INTEGER,
    started_at TEXT,
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_workflows_task_id ON workflows(task_id);
CREATE INDEX IF NOT EXISTS idx_schedules_workflow_id ON schedules(workflow_id);
CREATE INDEX IF NOT EXISTS idx_schedules_is_active ON schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_step_results_run_id ON step_results(run_id);
```

### CodeMirror Shell Editor (React)

```typescript
// src/components/center/ShellEditor.tsx
import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { oneDark } from "@codemirror/theme-one-dark";

interface ShellEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ShellEditor({ value, onChange, placeholder }: ShellEditorProps) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      height="120px"
      theme={oneDark}
      extensions={[StreamLanguage.define(shell)]}
      placeholder={placeholder ?? "echo 'Hello, World!'"}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: true,
        bracketMatching: true,
      }}
    />
  );
}
```

### Cron Scheduler UI (React)

```typescript
// src/components/center/CronScheduler.tsx
import cronstrue from "cronstrue";
import { useState, useMemo } from "react";

const PRESETS = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every day at midnight", value: "0 0 * * *" },
  { label: "Every Monday at 9am", value: "0 9 * * 1" },
  { label: "First of every month", value: "0 0 1 * *" },
];

function CronPreview({ expression }: { expression: string }) {
  const description = useMemo(() => {
    try {
      return cronstrue.toString(expression);
    } catch {
      return null;
    }
  }, [expression]);

  // Next 3 run times computed by backend via Tauri command
  // ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| File-only workflow storage | SQLite for metadata + JSON steps column | Phase 3 | Enables scheduling, run history, queries. File-based save/load in models/workflow.rs becomes secondary (export/import only). |
| Untyped `Vec<serde_json::Value>` steps | `StepDefinition` enum with Shell/Http/Manual variants | Phase 3 | Type-safe dispatch in executor, validated at deserialization time |
| No backend execution engine | Pipeline executor with Document passing | Phase 3 | Core workflow execution capability |
| Static ExecutionDiagram (display-only) | Interactive diagram with progress + retry | Phase 3 | Real-time execution feedback |

**Deprecated/outdated in existing code:**
- `models/workflow.rs` file-based `save_workflow`/`load_workflow`/`list_workflows`/`delete_workflow` functions: These will be superseded by SQLite-backed workflow CRUD. The file-based functions can be retained as export/import utilities but are no longer the primary storage mechanism.

## Discretion Recommendations

### Flowchart rendering: Keep existing SVG-based StepItem approach

The current `ExecutionDiagram` + `StepItem` components already render a step-by-step vertical flowchart with numbered circles and connector lines via CSS. This is clean, lightweight, and matches the UI spec. No charting library needed. Extend `StepItem` with status overlays (checkmark/X icons) and the `animate-pulse` border for running state. **Confidence: HIGH** -- the existing implementation is well-suited.

### Workflow definition format: JSON (already decided in Phase 1)

STATE.md records: "[Phase 01]: JSON for workflow definitions (not YAML) due to serde-yaml deprecation." This is locked. Store `steps_json TEXT` in SQLite as a JSON-serialized `Vec<StepDefinition>`. serde_json handles serialization/deserialization natively. **Confidence: HIGH** -- consistent with existing decisions.

### Loading states during workflow execution

Follow UI-SPEC.md exactly: current step border pulses (`animate-pulse`), step number replaced with spinner icon (use lucide-react `Loader2` with `animate-spin`), completed steps show `Check` icon overlay, failed steps show `X` icon overlay. Between "Run Now" click and first step starting, show a "Starting workflow..." skeleton state. **Confidence: HIGH** -- matches UI spec.

## Open Questions

1. **Shell command PATH resolution**
   - What we know: `tokio::process::Command` via `sh -c` inherits the app's environment. In Tauri desktop apps, the PATH may differ from the user's terminal PATH (especially on macOS where GUI apps get a minimal PATH).
   - What's unclear: Whether Tauri 2 handles PATH inheritance from the user's shell or if explicit `env::set_var` setup is needed.
   - Recommendation: Test empirically during implementation. If PATH is limited, read the user's shell profile (`~/.zshrc`, `~/.bashrc`) at startup and set PATH accordingly. This is a known macOS desktop app gotcha.

2. **reqwest TLS feature flags**
   - What we know: reqwest defaults to rustls-tls. Some enterprise APIs require system-native TLS (for corporate proxy/CA certificates).
   - What's unclear: Whether the target user base will hit TLS issues with rustls.
   - Recommendation: Start with `rustls-tls` (simpler, no system dependency). If users report TLS issues, add `native-tls` feature flag as an option.

3. **Concurrent workflow execution limits**
   - What we know: CONTEXT.md says sequential execution only within a workflow (no parallel steps). But multiple workflows could be triggered simultaneously (e.g., two cron schedules fire at the same time).
   - What's unclear: Whether to allow truly parallel workflow runs or serialize them.
   - Recommendation: Allow parallel workflow runs (each in its own tokio task) but serialize steps within each workflow. Add a configurable max concurrent workflows (default: 3) to prevent resource exhaustion.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (frontend) | Vitest 4.x (configured in vite.config.ts) |
| Framework (backend) | cargo test (built-in) |
| Config file | vite.config.ts (test section), no separate vitest.config |
| Quick run command | `npm run test` / `cd src-tauri && cargo test` |
| Full suite command | `npm run test && cd src-tauri && cargo test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TASK-05 | Multi-step workflow CRUD and execution | unit (Rust) | `cd src-tauri && cargo test engine::` | No -- Wave 0 |
| TASK-05 | WorkflowBuilder renders steps, insert, reorder | unit (React) | `npx vitest run src/components/center/WorkflowBuilder.test.tsx` | No -- Wave 0 |
| TASK-06 | Step type assignment (shell/HTTP/manual) | unit (Rust) | `cd src-tauri && cargo test models::workflow` | No -- Wave 0 |
| AUTO-01 | Schedule CRUD, cron parsing, next-run times | unit (Rust) | `cd src-tauri && cargo test models::schedule` | No -- Wave 0 |
| AUTO-01 | CronScheduler UI presets and advanced mode | unit (React) | `npx vitest run src/components/center/CronScheduler.test.tsx` | No -- Wave 0 |
| AUTO-02 | Promote task to workflow | unit (Rust) | `cd src-tauri && cargo test commands::workflow_commands::test_promote` | No -- Wave 0 |
| AUTO-03 | Shell command execution with timeout and output capture | unit (Rust) | `cd src-tauri && cargo test engine::shell` | No -- Wave 0 |
| AUTO-04 | HTTP request execution with method/headers/body | unit (Rust) | `cd src-tauri && cargo test engine::http` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test && cd src-tauri && cargo test`
- **Per wave merge:** Full suite
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src-tauri/src/engine/mod.rs` -- engine module declaration
- [ ] `src-tauri/src/engine/shell.rs` tests -- shell executor unit tests with mocked processes
- [ ] `src-tauri/src/engine/http.rs` tests -- HTTP executor unit tests (use mockito or wiremock crate)
- [ ] `src-tauri/src/models/schedule.rs` tests -- schedule CRUD, cron next-run computation
- [ ] `src-tauri/src/db/sql/002_workflows.sql` -- migration for new tables
- [ ] `src/components/center/WorkflowBuilder.test.tsx` -- step list rendering, insert, reorder
- [ ] `src/components/center/CronScheduler.test.tsx` -- preset selection, advanced mode toggle
- [ ] Rust test dependency: `mockito` or `wiremock` crate for HTTP mocking

## Sources

### Primary (HIGH confidence)
- [Tauri 2 Shell Plugin](https://v2.tauri.app/plugin/shell/) -- shell command execution, permission scoping
- [Tauri 2 Calling Frontend from Rust](https://v2.tauri.app/develop/calling-frontend/) -- Emitter trait, event system, channels
- [tokio-cron-scheduler GitHub](https://github.com/mvniekerk/tokio-cron-scheduler) -- Job::new_async API, cron expression format
- [tokio-cron-scheduler crates.io](https://crates.io/crates/tokio-cron-scheduler) -- version 0.15.x, download stats
- [reqwest crates.io](https://crates.io/crates/reqwest) -- version 0.13.x, feature flags, async API
- [reqwest docs.rs](https://docs.rs/reqwest/) -- Client API, request builder, response handling
- [@uiw/react-codemirror GitHub](https://github.com/uiwjs/react-codemirror) -- CodeMirror 6 React wrapper, API reference
- [cronstrue npm](https://www.npmjs.com/package/cronstrue) -- cron-to-English translation, version 2.x

### Secondary (MEDIUM confidence)
- [tokio-cron-scheduler docs.rs](https://docs.rs/tokio-cron-scheduler/latest/tokio_cron_scheduler/) -- JobScheduler API, timezone support
- [Tauri shell plugin bug: spawn hanging in production](https://github.com/tauri-apps/tauri/issues/11513) -- known issue with shell command hanging, relevant for process management
- [CodeMirror 6 React integration patterns](https://thetrevorharmon.com/blog/codemirror-and-react/) -- CM6 lifecycle management in React

### Tertiary (LOW confidence)
- [tauri-plugin-schedule-task](https://crates.io/crates/tauri-plugin-schedule-task) -- mentioned in STACK.md but tokio-cron-scheduler is better suited for this phase's needs (more control, more downloads, better documented)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All recommended libraries are well-established with high download counts and active maintenance
- Architecture: HIGH - Patterns follow existing codebase conventions (Tauri IPC, Zustand stores, Mutex<Database>) and extend them naturally
- Pitfalls: HIGH - Based on direct code analysis of existing patterns (Mutex usage, process lifecycle) and well-documented Tauri/tokio concerns
- Validation: MEDIUM - Test patterns are standard but the engine module is net-new Rust code requiring new test infrastructure

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable ecosystem, 30-day validity)
