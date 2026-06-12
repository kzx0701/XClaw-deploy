#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const version = process.argv[2]?.trim();

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Usage: npm run release -- <x.y.z>");
  console.error("Example: npm run release -- 1.3.1");
  process.exit(1);
}

const rootDir = process.cwd();
const tag = `v${version}`;

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runCapture = (command, args) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  return result.stdout?.trim() ?? "";
};

console.log(`\n🚀 XClaw Release ${version}\n`);

// 1. 检查是否有未提交的变更
console.log("📋 检查工作区状态...");
const status = runCapture("git", ["status", "--porcelain"]);
if (status) {
  console.error("❌ 工作区有未提交的变更，请先提交或暂存：");
  console.error(status);
  process.exit(1);
}
console.log("✅ 工作区干净\n");

// 2. 检查标签是否已存在
console.log("🏷️  检查标签是否已存在...");
const existingTag = runCapture("git", ["tag", "-l", tag]);
if (existingTag) {
  console.error(`❌ 标签 ${tag} 已存在`);
  process.exit(1);
}
console.log(`✅ 标签 ${tag} 可用\n`);

// 3. 检查是否在 main 分支
console.log("🌿 检查当前分支...");
const currentBranch = runCapture("git", ["branch", "--show-current"]);
if (currentBranch !== "main") {
  console.error(`❌ 当前不在 main 分支（当前: ${currentBranch}）`);
  process.exit(1);
}
console.log("✅ 在 main 分支\n");

// 4. 更新版本号
console.log("📝 更新版本号...");
run(process.execPath, ["scripts/bump-version.mjs", version]);
console.log("");

// 5. 提交变更
console.log("💾 提交版本变更...");
run("git", ["add", "package.json", "src-tauri/tauri.conf.json", "src-tauri/Cargo.toml"]);
run("git", ["commit", "-m", `release: v${version}`]);
console.log("");

// 6. 创建标签
console.log("🏷️  创建标签...");
run("git", ["tag", "-a", tag, "-m", `Release ${version}`]);
console.log("");

// 7. 推送
console.log("📤 推送到远程...");
run("git", ["push", "origin", "main"]);
run("git", ["push", "origin", tag]);
console.log("");

console.log("✅ 发版完成！\n");
console.log("📦 GitHub Actions 正在构建中...");
console.log(`🔗 查看构建状态: https://github.com/kzx0701/XClaw/actions`);
console.log(`🔗 发布页面: https://github.com/kzx0701/XClaw/releases/tag/${tag}\n`);
