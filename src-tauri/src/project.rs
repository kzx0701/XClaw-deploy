use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectScanResult {
    name: String,
    local_path: String,
    package_json_path: String,
    project_type: String,
    package_manager: String,
    scripts: HashMap<String, String>,
    detected_build_command: String,
    detected_output_dir: String,
    default_build_command: String,
    default_output_dir: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectAiContextFile {
    path: String,
    content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectAiContextResult {
    project_path: String,
    package_json: String,
    files: Vec<ProjectAiContextFile>,
}

#[tauri::command]
pub fn scan_project(project_path: String) -> Result<ProjectScanResult, String> {
    let project_path = Path::new(&project_path);

    if !project_path.exists() {
        return Err("项目路径不存在".into());
    }

    if !project_path.is_dir() {
        return Err("项目路径不是目录".into());
    }

    let package_json_path = project_path.join("package.json");

    if !package_json_path.exists() {
        return Err("未找到 package.json".into());
    }

    let content = std::fs::read_to_string(&package_json_path)
        .map_err(|error| format!("读取 package.json 失败: {error}"))?;
    let package_json: Value =
        serde_json::from_str(&content).map_err(|error| format!("解析 package.json 失败: {error}"))?;

    let name = package_json
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or("unknown-project")
        .to_string();

    let scripts = package_json
        .get("scripts")
        .and_then(Value::as_object)
        .map(|entries| {
            entries
                .iter()
                .filter_map(|(key, value)| value.as_str().map(|command| (key.clone(), command.to_string())))
                .collect::<HashMap<String, String>>()
        })
        .unwrap_or_default();

    let dependencies = extract_dependency_names(&package_json);
    let project_type = detect_project_type(project_path, &dependencies);
    let package_manager = detect_package_manager(project_path);
    let detected_output_dir = detect_output_dir(&project_type).to_string();
    let detected_build_command = detect_build_command(&scripts, &package_manager);

    Ok(ProjectScanResult {
        name,
        local_path: project_path.to_string_lossy().to_string(),
        package_json_path: package_json_path.to_string_lossy().to_string(),
        project_type,
        package_manager,
        scripts,
        detected_build_command: detected_build_command.clone(),
        detected_output_dir: detected_output_dir.clone(),
        default_build_command: detected_build_command,
        default_output_dir: detected_output_dir,
    })
}

#[tauri::command]
pub fn scan_project_ai_context(project_path: String) -> Result<ProjectAiContextResult, String> {
    let project_path = Path::new(&project_path);

    if !project_path.exists() {
        return Err("项目路径不存在".into());
    }

    if !project_path.is_dir() {
        return Err("项目路径不是目录".into());
    }

    let package_json_path = project_path.join("package.json");

    if !package_json_path.exists() {
        return Err("未找到 package.json".into());
    }

    let package_json = std::fs::read_to_string(&package_json_path)
        .map_err(|error| format!("读取 package.json 失败: {error}"))?;

    let candidate_files = [
        "vite.config.ts",
        "vite.config.js",
        "vite.config.mts",
        "vite.config.mjs",
        "vite.config.cts",
        "vite.config.cjs",
        "vue.config.js",
        "webpack.config.js",
        "webpack.config.ts",
    ];

    let files = candidate_files
        .iter()
        .filter_map(|relative_path| {
            let file_path = project_path.join(relative_path);

            if !file_path.exists() || !file_path.is_file() {
                return None;
            }

            match std::fs::read_to_string(&file_path) {
                Ok(content) => Some(ProjectAiContextFile {
                    path: (*relative_path).to_string(),
                    content,
                }),
                Err(_) => None,
            }
        })
        .collect::<Vec<_>>();

    Ok(ProjectAiContextResult {
        project_path: project_path.to_string_lossy().to_string(),
        package_json,
        files,
    })
}

fn extract_dependency_names(package_json: &Value) -> Vec<String> {
    ["dependencies", "devDependencies"]
        .iter()
        .filter_map(|key| package_json.get(key).and_then(Value::as_object))
        .flat_map(|deps| deps.keys().cloned())
        .collect()
}

fn detect_project_type(project_path: &Path, dependencies: &[String]) -> String {
    let has_vite_config = ["ts", "js", "mts", "mjs", "cts", "cjs"]
        .iter()
        .any(|ext| project_path.join(format!("vite.config.{ext}")).exists());
    let has_vue = dependencies.iter().any(|dep| dep == "vue");
    let has_react = dependencies.iter().any(|dep| dep == "react");
    let has_vue_cli = dependencies.iter().any(|dep| dep == "@vue/cli-service");
    let has_react_scripts = dependencies.iter().any(|dep| dep == "react-scripts");

    if has_vite_config && has_vue {
        return "vite-vue".into();
    }

    if has_vite_config && has_react {
        return "vite-react".into();
    }

    if has_vue_cli {
        return "vue-cli".into();
    }

    if has_react_scripts {
        return "react".into();
    }

    "unknown".into()
}

fn detect_package_manager(project_path: &Path) -> String {
    if project_path.join("pnpm-lock.yaml").exists() {
        return "pnpm".into();
    }

    if project_path.join("yarn.lock").exists() {
        return "yarn".into();
    }

    if project_path.join("package-lock.json").exists() {
        return "npm".into();
    }

    "unknown".into()
}

fn detect_output_dir(project_type: &str) -> &'static str {
    match project_type {
        "react" => "build",
        _ => "dist",
    }
}

fn detect_build_command(scripts: &HashMap<String, String>, package_manager: &str) -> String {
    if scripts.contains_key("build") {
        return match package_manager {
            "pnpm" => "pnpm build".into(),
            "yarn" => "yarn build".into(),
            _ => "npm run build".into(),
        };
    }

    let mut build_variants = scripts
        .keys()
        .filter(|name| name.starts_with("build:"))
        .cloned()
        .collect::<Vec<_>>();
    build_variants.sort();

    if let Some(script_name) = build_variants.first() {
        return match package_manager {
            "pnpm" => format!("pnpm {script_name}"),
            "yarn" => format!("yarn {script_name}"),
            _ => format!("npm run {script_name}"),
        };
    }

    String::new()
}
