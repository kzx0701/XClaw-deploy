use serde::Serialize;
use serde_json::Value;
use std::env;
use std::path::PathBuf;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalGatewayConfigResult {
    auth_mode: String,
    open_responses_enabled: bool,
    source_path: String,
    token: String,
    url: String,
}

#[tauri::command]
pub fn load_local_openclaw_gateway_config() -> Result<LocalGatewayConfigResult, String> {
    let config_path = resolve_openclaw_config_path()?;
    let content = std::fs::read_to_string(&config_path)
        .map_err(|error| format!("读取 OpenClaw 配置失败: {error}"))?;
    let parsed: Value =
        serde_json::from_str(&content).map_err(|error| format!("解析 OpenClaw 配置失败: {error}"))?;

    let gateway = parsed
        .get("gateway")
        .and_then(Value::as_object)
        .ok_or("OpenClaw 配置中缺少 gateway 字段")?;
    let open_responses_enabled = parsed
        .get("gateway")
        .and_then(Value::as_object)
        .and_then(|gateway| gateway.get("http"))
        .and_then(Value::as_object)
        .and_then(|http| http.get("endpoints"))
        .and_then(Value::as_object)
        .and_then(|endpoints| endpoints.get("responses"))
        .and_then(Value::as_object)
        .and_then(|responses| responses.get("enabled"))
        .and_then(Value::as_bool)
        .unwrap_or(false);

    let auth = gateway
        .get("auth")
        .and_then(Value::as_object)
        .ok_or("OpenClaw 配置中缺少 gateway.auth 字段")?;

    let auth_mode = auth
        .get("mode")
        .and_then(Value::as_str)
        .unwrap_or("token")
        .to_string();

    if auth_mode != "token" {
        return Err(format!("当前仅支持导入 token 模式，检测到 auth.mode={auth_mode}"));
    }

    let token = auth
        .get("token")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim()
        .to_string();

    if token.is_empty() {
        return Err("OpenClaw 配置中没有可用的 gateway.auth.token".into());
    }

    let port = gateway.get("port").and_then(Value::as_u64).unwrap_or(18789);
    let bind = gateway
        .get("bind")
        .and_then(Value::as_str)
        .unwrap_or("loopback");
    let host = if bind == "loopback" { "127.0.0.1" } else { bind };
    let url = format!("ws://{host}:{port}");

    Ok(LocalGatewayConfigResult {
        auth_mode,
        open_responses_enabled,
        source_path: config_path.to_string_lossy().to_string(),
        token,
        url,
    })
}

fn resolve_openclaw_config_path() -> Result<PathBuf, String> {
    if let Ok(explicit) = env::var("OPENCLAW_CONFIG_PATH") {
        let trimmed = explicit.trim();
        if !trimmed.is_empty() {
            let path = PathBuf::from(trimmed);
            if path.exists() {
                return Ok(path);
            }
        }
    }

    let home = env::var("HOME").map_err(|_| "无法读取 HOME 环境变量".to_string())?;
    let default_path = PathBuf::from(home).join(".openclaw").join("openclaw.json");

    if default_path.exists() {
        return Ok(default_path);
    }

    Err("未找到本机 OpenClaw 配置文件，请确认已安装并初始化 OpenClaw".into())
}
