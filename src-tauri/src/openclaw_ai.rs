use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{Read, Write};
use std::net::TcpStream;
use std::time::Duration;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectAiContextFile {
    path: String,
    content: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectAiContextRequest {
    project_path: String,
    package_json: String,
    files: Vec<ProjectAiContextFile>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GatewayAiProjectReviewRequest {
    url: String,
    token: String,
    context: ProjectAiContextRequest,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectAiRecommendation {
    recommended_build_command: String,
    recommended_output_dir: String,
    confidence: String,
    reason: String,
    alternatives: Vec<String>,
}

#[tauri::command]
pub fn request_project_ai_review(
    request: GatewayAiProjectReviewRequest,
) -> Result<ProjectAiRecommendation, String> {
    let (host, port, path) = parse_openclaw_http_url(&request.url)?;
    let body = json!({
        "model": "gpt-4.1-mini",
        "input": build_prompt(&request.context),
    });
    let body_text =
        serde_json::to_string(&body).map_err(|error| format!("序列化 AI 请求体失败: {error}"))?;

    let mut stream = TcpStream::connect(format!("{host}:{port}"))
        .map_err(|error| format!("连接 OpenClaw HTTP 服务失败: {error}"))?;
    stream
        .set_read_timeout(Some(Duration::from_secs(90)))
        .map_err(|error| format!("设置读取超时失败: {error}"))?;
    stream
        .set_write_timeout(Some(Duration::from_secs(15)))
        .map_err(|error| format!("设置写入超时失败: {error}"))?;

    let http_request = format!(
        "POST {path}/v1/responses HTTP/1.1\r\nHost: {host}:{port}\r\nAuthorization: Bearer {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        request.token.trim(),
        body_text.as_bytes().len(),
        body_text
    );

    stream
        .write_all(http_request.as_bytes())
        .map_err(|error| format!("发送 OpenClaw AI 请求失败: {error}"))?;

    let mut response_text = String::new();
    stream
        .read_to_string(&mut response_text)
        .map_err(|error| format!("读取 OpenClaw AI 响应失败: {error}"))?;

    let (status_code, headers, body) = split_http_response(&response_text)?;
    let normalized_body = normalize_http_body(headers, body)?;

    if !(200..300).contains(&status_code) {
        return Err(format!(
            "OpenClaw AI 请求失败，HTTP {}: {}",
            status_code,
            extract_error_message(&normalized_body)
        ));
    }

    let payload: Value = serde_json::from_str(&normalized_body)
        .map_err(|error| format!("解析 OpenClaw AI 响应失败: {error}"))?;
    let text = extract_output_text(&payload)?;
    let cleaned = strip_markdown_fence(&text);
    let parsed: Value =
        serde_json::from_str(&cleaned).map_err(|error| format!("解析 AI 建议 JSON 失败: {error}"))?;

    Ok(ProjectAiRecommendation {
        recommended_build_command: parsed
            .get("recommendedBuildCommand")
            .and_then(Value::as_str)
            .unwrap_or("")
            .trim()
            .to_string(),
        recommended_output_dir: parsed
            .get("recommendedOutputDir")
            .and_then(Value::as_str)
            .unwrap_or("")
            .trim()
            .to_string(),
        confidence: parsed
            .get("confidence")
            .and_then(Value::as_str)
            .unwrap_or("low")
            .to_string(),
        reason: parsed
            .get("reason")
            .and_then(Value::as_str)
            .unwrap_or("AI 未提供原因说明")
            .trim()
            .to_string(),
        alternatives: parsed
            .get("alternatives")
            .and_then(Value::as_array)
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| item.as_str().map(|value| value.trim().to_string()))
                    .filter(|value| !value.is_empty())
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default(),
    })
}

fn parse_openclaw_http_url(url: &str) -> Result<(String, u16, String), String> {
    let trimmed = url.trim();

    if trimmed.is_empty() {
        return Err("网关地址不能为空".into());
    }

    let without_scheme = trimmed
        .strip_prefix("ws://")
        .or_else(|| trimmed.strip_prefix("http://"))
        .ok_or("当前仅支持 ws:// 或 http:// 的本地 OpenClaw 地址")?;

    let mut parts = without_scheme.splitn(2, '/');
    let host_port = parts.next().unwrap_or("");
    let path_suffix = parts.next().unwrap_or("");
    let mut host_port_parts = host_port.splitn(2, ':');
    let host = host_port_parts.next().unwrap_or("").trim().to_string();
    let port = host_port_parts
        .next()
        .unwrap_or("18789")
        .trim()
        .parse::<u16>()
        .map_err(|_| "网关端口格式不正确".to_string())?;
    let path = if path_suffix.trim().is_empty() {
        String::new()
    } else {
        format!("/{}", path_suffix.trim_matches('/'))
    };

    if host.is_empty() {
        return Err("网关地址中缺少主机名".into());
    }

    Ok((host, port, path))
}

fn build_prompt(context: &ProjectAiContextRequest) -> String {
    let config_files = if context.files.is_empty() {
        "没有检测到额外构建配置文件。".to_string()
    } else {
        context
            .files
            .iter()
            .map(|file| format!("文件: {}\n```\n{}\n```", file.path, file.content))
            .collect::<Vec<_>>()
            .join("\n\n")
    };

    [
        "你是一个前端工程构建配置助手。请根据给定项目信息，判断这个项目最合理的打包命令和产物输出目录。",
        "要求：",
        "1. 优先给出最可能正确、最适合生产打包的命令。",
        "2. 产物目录只返回相对目录名，例如 dist、build。",
        "3. 如果信息不足，也要基于 package.json 和配置文件给出最合理判断。",
        "4. 只返回 JSON，不要返回 markdown 代码块，不要解释到 JSON 之外。",
        "5. JSON 结构必须严格如下：{\"recommendedBuildCommand\":\"...\",\"recommendedOutputDir\":\"...\",\"confidence\":\"high|medium|low\",\"reason\":\"...\",\"alternatives\":[\"...\"]}",
        "",
        &format!("项目路径：{}", context.project_path),
        "",
        "package.json:",
        &context.package_json,
        "",
        "构建相关配置文件：",
        &config_files,
    ]
    .join("\n")
}

fn split_http_response(response: &str) -> Result<(u16, &str, &str), String> {
    let mut parts = response.splitn(2, "\r\n\r\n");
    let headers = parts.next().ok_or("OpenClaw AI 响应格式异常")?;
    let body = parts.next().unwrap_or("");
    let status_line = headers.lines().next().ok_or("OpenClaw AI 响应缺少状态行")?;
    let status_code = status_line
        .split_whitespace()
        .nth(1)
        .ok_or("OpenClaw AI 响应状态码缺失")?
        .parse::<u16>()
        .map_err(|_| "OpenClaw AI 响应状态码格式不正确".to_string())?;

    Ok((status_code, headers, body))
}

fn normalize_http_body(headers: &str, body: &str) -> Result<String, String> {
    let is_chunked = headers
        .lines()
        .any(|line| line.to_ascii_lowercase().starts_with("transfer-encoding:") && line.to_ascii_lowercase().contains("chunked"));

    if !is_chunked {
        return Ok(body.to_string());
    }

    decode_chunked_body(body)
}

fn decode_chunked_body(body: &str) -> Result<String, String> {
    let mut rest = body;
    let mut decoded = String::new();

    loop {
        let Some(line_end) = rest.find("\r\n") else {
            return Err("OpenClaw AI chunked 响应格式异常".into());
        };

        let size_line = &rest[..line_end];
        let size_hex = size_line.split(';').next().unwrap_or("").trim();
        let size = usize::from_str_radix(size_hex, 16)
            .map_err(|_| "OpenClaw AI chunked 响应分块长度解析失败".to_string())?;

        rest = &rest[(line_end + 2)..];

        if size == 0 {
            break;
        }

        if rest.len() < size + 2 {
            return Err("OpenClaw AI chunked 响应内容长度不足".into());
        }

        decoded.push_str(&rest[..size]);
        rest = &rest[(size + 2)..];
    }

    Ok(decoded)
}

fn extract_output_text(payload: &Value) -> Result<String, String> {
    if let Some(output_text) = payload.get("output_text").and_then(Value::as_str) {
        if !output_text.trim().is_empty() {
            return Ok(output_text.trim().to_string());
        }
    }

    let output = payload
        .get("output")
        .and_then(Value::as_array)
        .ok_or("OpenClaw AI 未返回 output 字段")?;

    let mut result = Vec::new();

    for item in output {
        if let Some(contents) = item.get("content").and_then(Value::as_array) {
            for content in contents {
                if let Some(text) = content.get("text").and_then(Value::as_str) {
                    if !text.trim().is_empty() {
                        result.push(text.trim().to_string());
                    }
                }
            }
        }
    }

    if result.is_empty() {
        return Err("OpenClaw AI 未返回可解析文本".into());
    }

    Ok(result.join("\n"))
}

fn strip_markdown_fence(text: &str) -> String {
    let trimmed = text.trim();

    if !trimmed.starts_with("```") {
        return trimmed.to_string();
    }

    trimmed
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim()
        .to_string()
}

fn extract_error_message(body: &str) -> String {
    if let Ok(value) = serde_json::from_str::<Value>(body) {
        if let Some(message) = value
            .get("error")
            .and_then(Value::as_object)
            .and_then(|error| error.get("message"))
            .and_then(Value::as_str)
        {
            return message.to_string();
        }
    }

    body.trim().to_string()
}
