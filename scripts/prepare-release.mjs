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
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run("node", ["scripts/bump-version.mjs", version]);
run("git", ["add", "package.json", "src-tauri/tauri.conf.json", "src-tauri/Cargo.toml"]);
run("git", ["commit", "-m", `release: bump version to ${version}`]);
run("git", ["tag", `v${version}`]);

console.log("");
console.log(`Release ${version} prepared successfully.`);
console.log("Next steps:");
console.log("  git push origin main");
console.log(`  git push origin v${version}`);
