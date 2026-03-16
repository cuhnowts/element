use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkflowDefinition {
    pub version: String,
    pub name: String,
    pub description: String,
    pub steps: Vec<serde_json::Value>,
}

pub fn save_workflow(dir: &Path, workflow: &WorkflowDefinition) -> Result<(), std::io::Error> {
    let file_path = dir.join(format!("{}.json", workflow.name));
    let json = serde_json::to_string_pretty(workflow)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
    std::fs::write(file_path, json)
}

pub fn load_workflow(path: &Path) -> Result<WorkflowDefinition, Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string(path)?;
    let workflow: WorkflowDefinition = serde_json::from_str(&content)?;
    Ok(workflow)
}

pub fn list_workflows(
    dir: &Path,
) -> Result<Vec<WorkflowDefinition>, Box<dyn std::error::Error>> {
    let mut workflows = Vec::new();

    if !dir.exists() {
        return Ok(workflows);
    }

    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("json") {
            match load_workflow(&path) {
                Ok(workflow) => workflows.push(workflow),
                Err(_) => continue, // Skip invalid files
            }
        }
    }

    Ok(workflows)
}

pub fn delete_workflow(dir: &Path, name: &str) -> Result<(), std::io::Error> {
    let file_path = dir.join(format!("{}.json", name));
    std::fs::remove_file(file_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn create_temp_dir() -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("element_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn sample_workflow() -> WorkflowDefinition {
        WorkflowDefinition {
            version: "1".to_string(),
            name: "example-workflow".to_string(),
            description: "A test workflow".to_string(),
            steps: vec![],
        }
    }

    #[test]
    fn test_save_and_load_roundtrip() {
        let dir = create_temp_dir();
        let workflow = sample_workflow();

        save_workflow(&dir, &workflow).unwrap();

        let loaded = load_workflow(&dir.join("example-workflow.json")).unwrap();
        assert_eq!(loaded.version, "1");
        assert_eq!(loaded.name, "example-workflow");
        assert_eq!(loaded.description, "A test workflow");
        assert!(loaded.steps.is_empty());

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn test_list_workflows_multiple() {
        let dir = create_temp_dir();

        let wf1 = WorkflowDefinition {
            version: "1".to_string(),
            name: "workflow-alpha".to_string(),
            description: "First".to_string(),
            steps: vec![],
        };
        let wf2 = WorkflowDefinition {
            version: "1".to_string(),
            name: "workflow-beta".to_string(),
            description: "Second".to_string(),
            steps: vec![],
        };

        save_workflow(&dir, &wf1).unwrap();
        save_workflow(&dir, &wf2).unwrap();

        let workflows = list_workflows(&dir).unwrap();
        assert_eq!(workflows.len(), 2);

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn test_delete_workflow() {
        let dir = create_temp_dir();
        let workflow = sample_workflow();

        save_workflow(&dir, &workflow).unwrap();
        assert!(dir.join("example-workflow.json").exists());

        delete_workflow(&dir, "example-workflow").unwrap();
        assert!(!dir.join("example-workflow.json").exists());

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn test_load_invalid_json() {
        let dir = create_temp_dir();
        let bad_file = dir.join("bad.json");
        fs::write(&bad_file, "not valid json").unwrap();

        let result = load_workflow(&bad_file);
        assert!(result.is_err());

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn test_workflow_with_empty_steps() {
        let dir = create_temp_dir();
        let workflow = WorkflowDefinition {
            version: "1".to_string(),
            name: "empty-steps".to_string(),
            description: "No steps defined".to_string(),
            steps: vec![],
        };

        save_workflow(&dir, &workflow).unwrap();
        let loaded = load_workflow(&dir.join("empty-steps.json")).unwrap();
        assert!(loaded.steps.is_empty());

        fs::remove_dir_all(&dir).unwrap();
    }
}
