use serde::{Deserialize, Serialize};
use std::env;
use std::path::Path;
use std::process::Command;
use std::time::SystemTime;
use tauri::async_runtime;

use crate::build_artifact::{resolve_artifact_dir, ArtifactResolution};
use crate::utils::combine_command_output;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalBuildRequest {
    project_path: String,
    build_command: String,
    output_dir: String,
    precheck_command: String,
    run_precheck: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalBuildResult {
    build_command: String,
    output_dir: String,
    output_path: String,
    artifact_verified: bool,
    artifact_resolved_by: String,
    artifact_candidates: Vec<String>,
    artifact_message: String,
    precheck_command: String,
    precheck_output: String,
    precheck_ran: bool,
    precheck_success: bool,
    build_output: String,
    success: bool,
}

#[tauri::command]
pub async fn run_local_build(request: LocalBuildRequest) -> Result<LocalBuildResult, String> {
    async_runtime::spawn_blocking(move || execute_local_build(request))
        .await
        .map_err(|error| format!("打包任务线程执行失败: {error}"))?
}

fn execute_local_build(request: LocalBuildRequest) -> Result<LocalBuildResult, String> {
    let project_path = Path::new(&request.project_path);

    if !project_path.exists() {
        return Err("项目目录不存在，无法执行打包".into());
    }

    if !project_path.is_dir() {
        return Err("项目路径不是目录，无法执行打包".into());
    }

    let build_started_at = SystemTime::now();
    let precheck_command = request.precheck_command.trim().to_string();
    let build_command = request.build_command.trim().to_string();
    let output_dir = request.output_dir.trim().to_string();

    if build_command.is_empty() {
        return Err("打包命令不能为空".into());
    }

    let mut precheck_output = String::new();
    let mut precheck_success = true;
    let precheck_ran = request.run_precheck && !precheck_command.is_empty();

    if precheck_ran {
        let precheck = run_shell_command(project_path, &precheck_command)?;
        precheck_success = precheck.status == 0;
        precheck_output = combine_command_output(&precheck.stdout, &precheck.stderr);

        if !precheck_success {
            return Ok(LocalBuildResult {
                build_command,
                output_dir: output_dir.clone(),
                output_path: project_path.join(&output_dir).to_string_lossy().to_string(),
                artifact_verified: false,
                artifact_resolved_by: "precheck-failed".into(),
                artifact_candidates: Vec::new(),
                artifact_message: "前置校验失败，未执行打包产物解析".into(),
                precheck_command,
                precheck_output,
                precheck_ran,
                precheck_success: false,
                build_output: String::new(),
                success: false,
            });
        }
    }

    let build = run_shell_command(project_path, &build_command)?;
    let build_output = combine_command_output(&build.stdout, &build.stderr);
    let artifact = if build.status == 0 {
        resolve_artifact_dir(project_path, &output_dir, build_started_at)
    } else {
        unresolved_artifact(project_path, &output_dir, "打包失败，未执行产物目录解析")
    };

    Ok(LocalBuildResult {
        build_command,
        output_dir: artifact.output_dir,
        output_path: artifact.output_path,
        artifact_verified: artifact.verified,
        artifact_resolved_by: artifact.resolved_by,
        artifact_candidates: artifact.candidates,
        artifact_message: artifact.message,
        precheck_command,
        precheck_output,
        precheck_ran,
        precheck_success,
        build_output,
        success: build.status == 0,
    })
}

fn unresolved_artifact(project_path: &Path, output_dir: &str, message: &str) -> ArtifactResolution {
    ArtifactResolution {
        output_dir: output_dir.to_string(),
        output_path: project_path.join(output_dir).to_string_lossy().to_string(),
        verified: false,
        resolved_by: "configured".into(),
        candidates: Vec::new(),
        message: message.into(),
    }
}

struct CommandOutput {
    status: i32,
    stderr: String,
    stdout: String,
}

fn run_shell_command(project_path: &Path, command: &str) -> Result<CommandOutput, String> {
    #[cfg(target_os = "windows")]
    let mut shell_command = {
        let mut shell_command = Command::new("cmd");
        shell_command.args(["/C", command]);
        shell_command
    };

    #[cfg(not(target_os = "windows"))]
    let mut shell_command = {
        let shell = env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        let mut shell_command = Command::new(shell);
        shell_command.args(["-lic", command]);
        shell_command
    };

    let mut child = shell_command
        .current_dir(project_path)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|error| format!("执行命令失败: {error}"))?;

    let mut stdout = String::new();
    let mut stderr = String::new();

    if let Some(mut buf) = child.stdout.take() {
        std::io::Read::read_to_string(&mut buf, &mut stdout).unwrap_or(0);
    }

    if let Some(mut buf) = child.stderr.take() {
        std::io::Read::read_to_string(&mut buf, &mut stderr).unwrap_or(0);
    }

    let exit_status = child
        .wait()
        .map_err(|error| format!("等待命令完成失败: {error}"))?;

    Ok(CommandOutput {
        status: exit_status.code().unwrap_or(-1),
        stdout,
        stderr,
    })
}
