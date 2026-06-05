use serde::{Deserialize, Serialize};
use std::env;
use std::path::Path;
use std::process::Command;
use tauri::async_runtime;

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
    let output_path = project_path.join(&output_dir);

    Ok(LocalBuildResult {
        build_command,
        output_dir,
        output_path: output_path.to_string_lossy().to_string(),
        precheck_command,
        precheck_output,
        precheck_ran,
        precheck_success,
        build_output,
        success: build.status == 0,
    })
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

    let output = shell_command
        .current_dir(project_path)
        .output()
        .map_err(|error| format!("执行命令失败: {error}"))?;

    Ok(CommandOutput {
        status: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

fn combine_command_output(stdout: &str, stderr: &str) -> String {
    match (stdout.trim(), stderr.trim()) {
        ("", "") => String::new(),
        ("", stderr) => stderr.to_string(),
        (stdout, "") => stdout.to_string(),
        (stdout, stderr) => format!("{stdout}\n{stderr}"),
    }
}
