fn main() {
    // Load .env from project root for OAuth client IDs
    let project_root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).parent().unwrap();
    let env_path = project_root.join(".env");

    let mut google_id = String::from("placeholder-google-client-id.apps.googleusercontent.com");
    let mut microsoft_id = String::from("placeholder-microsoft-client-id");

    // Check .env file first
    if env_path.exists() {
        for line in std::fs::read_to_string(&env_path).unwrap_or_default().lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some((key, value)) = line.split_once('=') {
                let key = key.trim();
                let value = value.trim();
                if !value.is_empty() {
                    match key {
                        "GOOGLE_CLIENT_ID" => google_id = value.to_string(),
                        "MICROSOFT_CLIENT_ID" => microsoft_id = value.to_string(),
                        _ => {}
                    }
                }
            }
        }
        println!("cargo:rerun-if-changed={}", env_path.display());
    }

    // Also check process env (overrides .env)
    if let Ok(val) = std::env::var("GOOGLE_CLIENT_ID") {
        if !val.is_empty() { google_id = val; }
    }
    if let Ok(val) = std::env::var("MICROSOFT_CLIENT_ID") {
        if !val.is_empty() { microsoft_id = val; }
    }

    // Set as rustc-env so env!() can read them
    println!("cargo:rustc-env=GOOGLE_CLIENT_ID={}", google_id);
    println!("cargo:rustc-env=MICROSOFT_CLIENT_ID={}", microsoft_id);

    tauri_build::build()
}
