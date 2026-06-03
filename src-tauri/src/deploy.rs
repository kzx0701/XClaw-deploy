use serde::{Deserialize, Serialize};
use ssh2::{FileStat, Session, Sftp};
use tauri::async_runtime;
use std::fs;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::time::Duration;
#[cfg(unix)]
use std::os::unix::fs::FileTypeExt;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
#[derive(Clone)]
pub struct LocalDeployRequest {
    project_name: String,
    output_path: String,
    remote_path: String,
    host: String,
    port: u16,
    username: String,
    auth_type: String,
    password: String,
    private_key_path: String,
    upload_strategy: String,
    post_deploy_command: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerConnectionCheckRequest {
    host: String,
    port: u16,
    username: String,
    auth_type: String,
    password: String,
    private_key_path: String,
    remote_path: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDeployResult {
    success: bool,
    steps: Vec<String>,
    command_output: String,
    error_message: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerConnectionCheckResult {
    success: bool,
    steps: Vec<String>,
}

#[tauri::command]
pub async fn run_local_deploy(request: LocalDeployRequest) -> Result<LocalDeployResult, String> {
    async_runtime::spawn_blocking(move || execute_local_deploy(request))
        .await
        .map_err(|error| format!("部署任务线程执行失败: {error}"))?
}

#[tauri::command]
pub async fn check_server_connection(
    request: ServerConnectionCheckRequest,
) -> Result<ServerConnectionCheckResult, String> {
    async_runtime::spawn_blocking(move || execute_server_connection_check(request))
        .await
        .map_err(|error| format!("连接检测线程执行失败: {error}"))?
}

fn execute_local_deploy(request: LocalDeployRequest) -> Result<LocalDeployResult, String> {
    let output_path = Path::new(&request.output_path);

    if !output_path.exists() {
        return Err("本地产物目录不存在，无法执行部署".into());
    }

    if !output_path.is_dir() {
        return Err("本地产物路径不是目录，无法执行部署".into());
    }

    let tcp = TcpStream::connect(format!("{}:{}", request.host.trim(), request.port))
        .map_err(|error| format!("连接服务器失败: {error}"))?;
    let _ = tcp.set_read_timeout(Some(Duration::from_secs(20)));
    let _ = tcp.set_write_timeout(Some(Duration::from_secs(20)));

    let mut session = Session::new().map_err(|error| format!("初始化 SSH 会话失败: {error}"))?;
    session.set_tcp_stream(tcp);
    session.set_timeout(20_000);
    session
        .handshake()
        .map_err(|error| format!("SSH 握手失败: {error}"))?;

    authenticate_session(&session, &request)?;

    if !session.authenticated() {
        return Err("SSH 认证失败，请检查用户名、密码或私钥".into());
    }

    let sftp = session.sftp().map_err(|error| format!("初始化 SFTP 失败: {error}"))?;
    let remote_root = Path::new(request.remote_path.trim());
    let mut steps = vec![
        format!("准备部署项目 {}", request.project_name.trim()),
        format!("正在连接服务器 {}:{}", request.host.trim(), request.port),
        format!("已连接服务器 {}:{}", request.host.trim(), request.port),
        format!("正在检查认证方式 {}", request.auth_type.trim()),
        format!("目标目录 {}", request.remote_path.trim()),
    ];
    let mut logs = Vec::<String>::new();

    ensure_remote_dir(&sftp, remote_root)?;
    steps.push("已检查并创建远端目录".into());

    if request.upload_strategy.trim() == "clear-and-upload" {
        steps.push("正在清理远端旧文件".into());
        clear_remote_dir(&sftp, remote_root)?;
        steps.push("已清理远端旧文件".into());
    }

    steps.push("正在上传本地产物".into());
    upload_directory(&sftp, output_path, remote_root)?;
    steps.push("已上传本地产物".into());

    let post_command = request.post_deploy_command.trim();

    if !post_command.is_empty() {
        steps.push("正在执行部署后命令".into());
        let output = run_remote_command(&session, post_command)?;
        if !output.trim().is_empty() {
            logs.push(output);
        }
        steps.push("已执行部署后命令".into());
    }

    Ok(LocalDeployResult {
        success: true,
        steps,
        command_output: logs.join("\n"),
        error_message: None,
    })
}

fn execute_server_connection_check(
    request: ServerConnectionCheckRequest,
) -> Result<ServerConnectionCheckResult, String> {
    let tcp = TcpStream::connect(format!("{}:{}", request.host.trim(), request.port))
        .map_err(|error| format!("连接服务器失败: {error}"))?;
    let _ = tcp.set_read_timeout(Some(Duration::from_secs(10)));
    let _ = tcp.set_write_timeout(Some(Duration::from_secs(10)));

    let mut session = Session::new().map_err(|error| format!("初始化 SSH 会话失败: {error}"))?;
    session.set_tcp_stream(tcp);
    session.set_timeout(10_000);
    session
        .handshake()
        .map_err(|error| format!("SSH 握手失败: {error}"))?;

    authenticate_check_session(&session, &request)?;

    if !session.authenticated() {
        return Err("SSH 认证失败，请检查用户名、密码或私钥".into());
    }

    let mut steps = vec![
        format!("已连接服务器 {}:{}", request.host.trim(), request.port),
        "SSH 认证成功".into(),
    ];

    if let Some(remote_path) = request.remote_path.as_deref() {
        let remote_path = remote_path.trim();

        if !remote_path.is_empty() {
            let sftp = session.sftp().map_err(|error| format!("初始化 SFTP 失败: {error}"))?;
            let remote_dir = Path::new(remote_path);
            ensure_remote_dir(&sftp, remote_dir)?;
            steps.push(format!("远端目录可访问：{}", remote_path));
        }
    }

    Ok(ServerConnectionCheckResult {
        success: true,
        steps,
    })
}

fn authenticate_session(session: &Session, request: &LocalDeployRequest) -> Result<(), String> {
    let username = request.username.trim();

    if username.is_empty() {
        return Err("服务器用户名不能为空".into());
    }

    match request.auth_type.trim() {
        "password" => {
            let password = request.password.trim();

            if password.is_empty() {
                return Err("密码认证模式下，服务器密码不能为空".into());
            }

            session
                .userauth_password(username, password)
                .map_err(|error| format!("密码认证失败: {error}"))?;
        }
        "privateKey" => {
            let key_path = request.private_key_path.trim();

            if key_path.is_empty() {
                return Err("私钥认证模式下，私钥路径不能为空".into());
            }

            let resolved_key_path = expand_tilde(key_path)?;

            session
                .userauth_pubkey_file(username, None, &resolved_key_path, None)
                .map_err(|error| format!("私钥认证失败: {error}"))?;
        }
        _ => {
            return Err("不支持的服务器认证方式".into());
        }
    }

    Ok(())
}

fn authenticate_check_session(
    session: &Session,
    request: &ServerConnectionCheckRequest,
) -> Result<(), String> {
    let username = request.username.trim();

    if username.is_empty() {
        return Err("服务器用户名不能为空".into());
    }

    match request.auth_type.trim() {
        "password" => {
            let password = request.password.trim();

            if password.is_empty() {
                return Err("密码认证模式下，服务器密码不能为空".into());
            }

            session
                .userauth_password(username, password)
                .map_err(|error| format!("密码认证失败: {error}"))?;
        }
        "privateKey" => {
            let key_path = request.private_key_path.trim();

            if key_path.is_empty() {
                return Err("私钥认证模式下，私钥路径不能为空".into());
            }

            let resolved_key_path = expand_tilde(key_path)?;

            session
                .userauth_pubkey_file(username, None, &resolved_key_path, None)
                .map_err(|error| format!("私钥认证失败: {error}"))?;
        }
        _ => {
            return Err("不支持的服务器认证方式".into());
        }
    }

    Ok(())
}

fn run_remote_command(session: &Session, command: &str) -> Result<String, String> {
    let mut channel = session
        .channel_session()
        .map_err(|error| format!("创建远端命令通道失败: {error}"))?;

    channel
        .exec(command)
        .map_err(|error| format!("执行远端命令失败: {error}"))?;

    let mut stdout = String::new();
    channel
        .read_to_string(&mut stdout)
        .map_err(|error| format!("读取远端命令输出失败: {error}"))?;

    let mut stderr = String::new();
    channel
        .stderr()
        .read_to_string(&mut stderr)
        .map_err(|error| format!("读取远端错误输出失败: {error}"))?;

    channel
        .wait_close()
        .map_err(|error| format!("关闭远端命令通道失败: {error}"))?;

    let exit_code = channel
        .exit_status()
        .map_err(|error| format!("读取远端命令状态失败: {error}"))?;

    let output = combine_command_output(&stdout, &stderr);

    if exit_code != 0 {
        return Err(if output.is_empty() {
            format!("远端命令执行失败，退出码 {exit_code}")
        } else {
            output
        });
    }

    Ok(output)
}

fn ensure_remote_dir(sftp: &Sftp, remote_dir: &Path) -> Result<(), String> {
    let mut current = PathBuf::new();

    for component in remote_dir.components() {
        current.push(component.as_os_str());

        if current.as_os_str().is_empty() {
            continue;
        }

        if sftp.stat(&current).is_err() {
            sftp.mkdir(&current, 0o755)
                .map_err(|error| format!("创建远端目录失败 {}: {error}", current.display()))?;
        }
    }

    Ok(())
}

fn clear_remote_dir(sftp: &Sftp, remote_dir: &Path) -> Result<(), String> {
    let entries = sftp
        .readdir(remote_dir)
        .map_err(|error| format!("读取远端目录失败 {}: {error}", remote_dir.display()))?;

    for (path, stat) in entries {
        if is_dot_entry(&path) {
            continue;
        }

        remove_remote_entry(sftp, &path, &stat)?;
    }

    Ok(())
}

fn remove_remote_entry(sftp: &Sftp, path: &Path, stat: &FileStat) -> Result<(), String> {
    if is_directory(stat) {
        let entries = sftp
            .readdir(path)
            .map_err(|error| format!("读取远端子目录失败 {}: {error}", path.display()))?;

        for (child_path, child_stat) in entries {
            if is_dot_entry(&child_path) {
                continue;
            }

            remove_remote_entry(sftp, &child_path, &child_stat)?;
        }

        sftp.rmdir(path)
            .map_err(|error| format!("删除远端目录失败 {}: {error}", path.display()))?;
    } else {
        sftp.unlink(path)
            .map_err(|error| format!("删除远端文件失败 {}: {error}", path.display()))?;
    }

    Ok(())
}

fn upload_directory(sftp: &Sftp, local_dir: &Path, remote_dir: &Path) -> Result<(), String> {
    let entries = fs::read_dir(local_dir)
        .map_err(|error| format!("读取本地目录失败 {}: {error}", local_dir.display()))?;

    for entry in entries {
        let entry = entry.map_err(|error| format!("读取本地目录项失败: {error}"))?;
        let local_path = entry.path();
        let remote_path = remote_dir.join(entry.file_name());
        let file_type = entry
            .file_type()
            .map_err(|error| format!("读取本地文件类型失败 {}: {error}", local_path.display()))?;

        if should_skip_file_type(&file_type) {
            continue;
        }

        if local_path.is_dir() {
          ensure_remote_dir(sftp, &remote_path)?;
          upload_directory(sftp, &local_path, &remote_path)?;
        } else {
          upload_file(sftp, &local_path, &remote_path)?;
        }
    }

    Ok(())
}

fn upload_file(sftp: &Sftp, local_file: &Path, remote_file: &Path) -> Result<(), String> {
    let bytes = fs::read(local_file)
        .map_err(|error| format!("读取本地文件失败 {}: {error}", local_file.display()))?;

    let mut remote = sftp
        .create(remote_file)
        .map_err(|error| format!("创建远端文件失败 {}: {error}", remote_file.display()))?;

    remote
        .write_all(&bytes)
        .map_err(|error| format!("写入远端文件失败 {}: {error}", remote_file.display()))?;

    Ok(())
}

fn is_directory(stat: &FileStat) -> bool {
    stat.perm.map(|perm| perm & 0o040000 == 0o040000).unwrap_or(false)
}

fn is_dot_entry(path: &Path) -> bool {
    matches!(path.file_name().and_then(|name| name.to_str()), Some(".") | Some(".."))
}

#[cfg(unix)]
fn should_skip_file_type(file_type: &fs::FileType) -> bool {
    file_type.is_symlink()
        || file_type.is_socket()
        || file_type.is_fifo()
        || file_type.is_block_device()
        || file_type.is_char_device()
}

#[cfg(not(unix))]
fn should_skip_file_type(file_type: &fs::FileType) -> bool {
    file_type.is_symlink()
}

fn expand_tilde(path: &str) -> Result<PathBuf, String> {
    if let Some(stripped) = path.strip_prefix("~/") {
        let home = std::env::var("HOME").map_err(|_| "无法解析当前用户 HOME 目录".to_string())?;
        return Ok(Path::new(&home).join(stripped));
    }

    Ok(PathBuf::from(path))
}

fn combine_command_output(stdout: &str, stderr: &str) -> String {
    match (stdout.trim(), stderr.trim()) {
        ("", "") => String::new(),
        ("", stderr) => stderr.to_string(),
        (stdout, "") => stdout.to_string(),
        (stdout, stderr) => format!("{stdout}\n{stderr}"),
    }
}
