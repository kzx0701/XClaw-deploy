use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArtifactResolution {
    pub output_dir: String,
    pub output_path: String,
    pub verified: bool,
    pub resolved_by: String,
    pub candidates: Vec<String>,
    pub message: String,
}

struct ArtifactCandidate {
    path: PathBuf,
    score: i32,
    modified: SystemTime,
}

pub fn resolve_artifact_dir(project_path: &Path, expected_output_dir: &str, build_started_at: SystemTime) -> ArtifactResolution {
    let expected_output_dir = normalize_relative_path(expected_output_dir).unwrap_or_else(|| "dist".into());
    let expected_path = project_path.join(&expected_output_dir);

    if looks_like_frontend_artifact(&expected_path) {
        return ArtifactResolution {
            output_dir: expected_output_dir,
            output_path: expected_path.to_string_lossy().to_string(),
            verified: true,
            resolved_by: "configured".into(),
            candidates: Vec::new(),
            message: "已验证配置的产物目录".into(),
        };
    }

    let candidates = scan_artifact_candidates(project_path, build_started_at);

    if let Some(best_candidate) = candidates.first() {
        let output_dir = best_candidate
            .path
            .strip_prefix(project_path)
            .unwrap_or(&best_candidate.path)
            .to_string_lossy()
            .replace('\\', "/");

        return ArtifactResolution {
            output_dir,
            output_path: best_candidate.path.to_string_lossy().to_string(),
            verified: true,
            resolved_by: "auto-scan".into(),
            candidates: candidates.iter().take(6).map(|candidate| relative_path(project_path, &candidate.path)).collect(),
            message: format!("配置的产物目录未通过校验，已自动采用 {}", relative_path(project_path, &best_candidate.path)),
        };
    }

    ArtifactResolution {
        output_dir: expected_output_dir,
        output_path: expected_path.to_string_lossy().to_string(),
        verified: false,
        resolved_by: "configured".into(),
        candidates: Vec::new(),
        message: "打包完成，但未找到可验证的前端产物目录".into(),
    }
}

pub fn looks_like_frontend_artifact(path: &Path) -> bool {
    if !path.exists() || !path.is_dir() {
        return false;
    }

    let entries = match fs::read_dir(path) {
        Ok(entries) => entries.filter_map(Result::ok).collect::<Vec<_>>(),
        Err(_) => return false,
    };

    if entries.is_empty() {
        return false;
    }

    let mut score = 0;

    if path.join("index.html").is_file() {
        score += 5;
    }

    for child_name in ["assets", "static", "_next", "_nuxt", "css", "js", "media"] {
        if path.join(child_name).is_dir() {
            score += 2;
        }
    }

    for entry in entries.iter().take(80) {
        let path = entry.path();
        if let Some(extension) = path.extension().and_then(|value| value.to_str()) {
            if matches!(extension, "html" | "js" | "css" | "mjs" | "map") {
                score += 1;
            }
        }
    }

    score >= 3
}

fn scan_artifact_candidates(project_path: &Path, build_started_at: SystemTime) -> Vec<ArtifactCandidate> {
    let mut candidates = Vec::new();

    for relative_path in common_artifact_dirs() {
        let path = project_path.join(relative_path);
        collect_candidate(project_path, &path, build_started_at, &mut candidates);
    }

    for workspace_root in ["apps", "packages"] {
        let root = project_path.join(workspace_root);
        if !root.exists() || !root.is_dir() {
            continue;
        }

        if let Ok(entries) = fs::read_dir(root) {
            for entry in entries.filter_map(Result::ok) {
                let package_path = entry.path();
                if !package_path.is_dir() {
                    continue;
                }

                for relative_path in common_artifact_dirs() {
                    collect_candidate(project_path, &package_path.join(relative_path), build_started_at, &mut candidates);
                }
            }
        }
    }

    candidates.sort_by(|left, right| {
        right
            .score
            .cmp(&left.score)
            .then_with(|| right.modified.cmp(&left.modified))
            .then_with(|| left.path.cmp(&right.path))
    });
    candidates
}

fn collect_candidate(project_path: &Path, path: &Path, build_started_at: SystemTime, candidates: &mut Vec<ArtifactCandidate>) {
    if !path.exists() || !path.is_dir() || !looks_like_frontend_artifact(path) {
        return;
    }

    let modified = latest_modified_time(path).unwrap_or(SystemTime::UNIX_EPOCH);
    let mut score = artifact_score(path);

    if modified >= build_started_at {
        score += 4;
    }

    if let Some(relative) = path.strip_prefix(project_path).ok().and_then(|value| value.to_str()) {
        if relative.contains("node_modules") || relative.contains(".git") {
            return;
        }
    }

    candidates.push(ArtifactCandidate {
        path: path.to_path_buf(),
        score,
        modified,
    });
}

fn artifact_score(path: &Path) -> i32 {
    let mut score = 0;

    if path.join("index.html").is_file() {
        score += 10;
    }

    for child_name in ["assets", "static", "_next", "_nuxt", "css", "js", "media"] {
        if path.join(child_name).is_dir() {
            score += 3;
        }
    }

    score
}

fn latest_modified_time(path: &Path) -> Option<SystemTime> {
    let mut latest = path.metadata().ok()?.modified().ok()?;

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.filter_map(Result::ok).take(120) {
            if let Ok(modified) = entry.metadata().and_then(|metadata| metadata.modified()) {
                if modified > latest {
                    latest = modified;
                }
            }
        }
    }

    Some(latest)
}

fn common_artifact_dirs() -> &'static [&'static str] {
    &[
        "dist",
        "build",
        "out",
        ".output/public",
        ".next",
        "storybook-static",
    ]
}

fn normalize_relative_path(value: &str) -> Option<String> {
    let normalized = value.trim().trim_start_matches("./").replace('\\', "/");

    if normalized.is_empty() || normalized.starts_with('/') || normalized.contains("..") {
        return None;
    }

    Some(normalized)
}

fn relative_path(project_path: &Path, path: &Path) -> String {
    path.strip_prefix(project_path)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}
