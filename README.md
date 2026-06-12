# XClaw

<div align="center">

**前端项目打包部署桌面工具**

[![Release](https://img.shields.io/github/v/release/kzx0701/XClaw?style=flat-square)](https://github.com/kzx0701/XClaw/releases)
[![License](https://img.shields.io/github/license/kzx0701/XClaw?style=flat-square)](LICENSE)
[![Stars](https://img.shields.io/github/stars/kzx0701/XClaw?style=flat-square)](https://github.com/kzx0701/XClaw/stargazers)

</div>

---

## 简介

XClaw 是一款基于 [Tauri 2](https://tauri.app/) 构建的桌面应用，为前端项目提供一键式本地打包与远程部署能力。

**核心特性：**

- 🔍 智能项目检测 — 自动识别框架类型、包管理器、构建命令和产物目录
- 📦 本地打包 — 支持 Vite、Next.js、Nuxt、Vue CLI、React 等主流框架
- 🚀 SSH 部署 — 通过 SFTP 上传产物到远程服务器，支持密码和私钥认证
- ⚡ 一键部署 — 从项目列表直接发起部署，跳过配置页面
- 📋 部署日志 — 完整记录每次部署的执行过程和结果

## 截图

<!-- TODO: 添加应用截图 -->

## 安装

### 下载

前往 [Releases](https://github.com/kzx0701/XClaw/releases) 页面下载最新版本：

| 平台                  | 文件                            | 说明                    |
| --------------------- | ------------------------------- | ----------------------- |
| macOS (Apple Silicon) | `XClaw-macOS-Apple-Silicon.dmg` | 适用于 M1/M2/M3/M4 芯片 |
| Windows (x64)         | `XClaw-Windows-x64-setup.exe`   | 适用于 Windows 10/11    |

### 从源码构建

**环境要求：**

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 10.11+
- [Rust](https://rustup.rs/) stable
- [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

```bash
# 克隆仓库
git clone https://github.com/kzx0701/XClaw.git
cd XClaw

# 安装依赖
pnpm install

# 启动开发模式
pnpm tauri dev

# 构建生产版本
pnpm tauri build
```

## 使用指南

### 1. 导入项目

- 点击「选择目录」按钮，使用系统目录选择器导入前端项目
- 或手动输入项目路径后按回车导入

XClaw 会自动扫描 `package.json`，识别：

- 项目类型（Vue、React、Next.js 等）
- 包管理器（pnpm/yarn/npm）
- 构建命令（`build`、`build:prod` 等）
- 产物目录（`dist`、`build`、`.next` 等）

### 2. 配置环境

为项目配置部署环境：

- **开发环境 (dev)** — 本地开发服务器
- **测试环境 (test)** — 测试/预发布环境
- **生产环境 (prod)** — 正式生产环境

每个环境需要配置：

- 绑定服务器
- 远端部署目录（如 `/var/www/my-app`）
- 上传策略（直接覆盖 / 清空后上传）
- 部署后执行的命令（可选）

### 3. 配置服务器

在「服务器」页面添加目标服务器：

| 字段     | 说明              |
| -------- | ----------------- |
| 名称     | 自定义服务器名称  |
| 主机     | 服务器 IP 或域名  |
| 端口     | SSH 端口，默认 22 |
| 用户名   | SSH 登录用户名    |
| 认证方式 | 密码 或 私钥      |

### 4. 执行部署

**标准部署：**

1. 在项目详情页选择执行模式
2. 配置打包命令和产物目录
3. 点击「开始执行」

**一键部署：**

1. 在项目列表点击「一键部署」按钮
2. 选择目标环境
3. 确认并执行

## 支持的框架

| 框架                 | 产物目录         | 状态        |
| -------------------- | ---------------- | ----------- |
| Vite + Vue           | `dist`           | ✅ 完整支持 |
| Vite + React         | `dist`           | ✅ 完整支持 |
| Next.js              | `.next`          | ✅ 完整支持 |
| Nuxt 3               | `.output/public` | ✅ 完整支持 |
| Vue CLI              | `dist`           | ✅ 完整支持 |
| Create React App     | `build`          | ✅ 完整支持 |
| SvelteKit            | `build`          | ✅ 完整支持 |
| Astro                | `dist`           | ✅ 完整支持 |
| 任意 `generate` 脚本 | `dist`           | ✅ 基础支持 |

## 技术栈

| 层次      | 技术                        |
| --------- | --------------------------- |
| 前端框架  | Vue 3.5 + TypeScript        |
| UI 组件库 | shadcn-vue + Tailwind CSS 4 |
| 状态管理  | Pinia 3                     |
| 构建工具  | Vite 6                      |
| 桌面框架  | Tauri 2 (Rust)              |
| SSH 能力  | ssh2 crate                  |
| 包管理    | pnpm 10                     |

## 开发

### 项目结构

```
claw-deploy/
├── src/                          # 前端源码
│   ├── components/               # UI 组件
│   ├── views/                    # 页面视图
│   │   └── workspace/            # 工作区
│   │       └── useWorkspace/     # Composables
│   ├── services/                 # 服务层
│   │   ├── execution/            # 打包部署服务
│   │   ├── project/              # 项目管理
│   │   └── server/               # 服务器管理
│   ├── stores/                   # Pinia 状态
│   ├── types/                    # TypeScript 类型
│   └── styles/                   # 全局样式
├── src-tauri/                    # Rust 后端
│   └── src/
│       ├── execution.rs          # 本地打包
│       ├── deploy.rs             # SSH 部署
│       ├── build_artifact.rs     # 产物检测
│       └── project_detection.rs  # 项目检测
├── scripts/                      # 构建脚本
└── .github/workflows/            # CI/CD
```

### 常用命令

```bash
pnpm dev              # 启动前端开发服务器
pnpm tauri dev        # 启动 Tauri 桌面应用（开发模式）
pnpm build            # 构建前端
pnpm tauri build      # 构建生产版本
pnpm release x.y.z    # 一键发布新版本
```

### 发布流程

```bash
# 一键发布（自动完成版本更新、提交、打标签、推送）
pnpm release 1.3.1
```

GitHub Actions 会自动构建 macOS 和 Windows 版本并发布到 [Releases](https://github.com/kzx0701/XClaw/releases)。

## 已知限制

- 服务器密码以明文存储在本地，仅适合内部使用
- 不支持 Monorepo 子包的独立部署（但支持产物目录扫描）
- 部署后命令执行超时为 300 秒
- 不支持增量上传（每次全量上传）

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

[MIT](LICENSE)
