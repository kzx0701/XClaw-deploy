import { spawnSync } from "node:child_process";
import process from "node:process";

const version = process.argv[2]?.trim();

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Usage: npm run release:prepare -- <x.y.z>");
  process.exit(1);
}

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run(process.execPath, ["scripts/bump-version.mjs", version]);
run("git", [
  "add",
  "package.json",
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
  "src-tauri/tauri.windows.conf.json",
  ".github/workflows/release-windows.yml",
  "docs/windows-release.md",
]);
run("git", ["commit", "-m", `release: bump version to ${version}`]);
run("git", ["tag", `v${version}`]);

console.log("");
console.log(`Release ${version} prepared successfully.`);
console.log("Next steps:");
console.log("  git push origin main");
console.log(`  git push origin v${version}`);
