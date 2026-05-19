#!/usr/bin/env node
// Claude Code 標準ハーネス静的チェック
// 必須ファイル存在チェック + 危険パターンスキャン

import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();

const REQUIRED_FILES = [
  "CLAUDE.md",
  "docs/harness.md",
  ".claude/harness/implementation-checklist.md",
  ".claude/harness/review-checklist.md",
  ".claude/harness/security-checklist.md",
  "scripts/harness-check.mjs",
  "package.json",
];

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "out",
  "coverage",
]);

const SCAN_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const errors = [];

// 1. 必須ファイル存在チェック
for (const rel of REQUIRED_FILES) {
  const full = join(ROOT, rel);
  if (!existsSync(full)) {
    errors.push(`[missing-file] 必須ファイルがありません: ${rel}`);
  }
}

// 2. package.json の build スクリプト確認
const pkgPath = join(ROOT, "package.json");
if (existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    if (!pkg.scripts || typeof pkg.scripts.build !== "string") {
      errors.push(`[package-json] package.json に "scripts.build" が定義されていません。`);
    }
  } catch (e) {
    errors.push(`[package-json] package.json の解析に失敗: ${e.message}`);
  }
}

// 3. 危険パターンスキャン
const DANGER_PATTERNS = [
  {
    id: "eval",
    regex: /\beval\s*\(/,
    message: "eval( を使用しています。動的コード実行は禁止です。",
  },
  {
    id: "new-function",
    regex: /\bnew\s+Function\s*\(/,
    message: "new Function( を使用しています。動的コード実行は禁止です。",
  },
  {
    id: "console-log-process-env",
    regex: /console\.log\s*\(\s*process\.env\b/,
    message: "console.log(process.env...) は環境変数の漏洩につながります。",
  },
  {
    id: "console-log-secret",
    // console.log の引数（同一行）に機密キーワードが現れるケース
    regex: /console\.log\s*\([^)]*\b(token|secret|password|apiKey|API_KEY)\b/i,
    message: "console.log に token/secret/password/apiKey/API_KEY が含まれています。機密情報を出力していないか確認してください。",
  },
];

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (EXCLUDE_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full);
    } else if (st.isFile()) {
      const dot = name.lastIndexOf(".");
      const ext = dot >= 0 ? name.slice(dot) : "";
      if (!SCAN_EXTENSIONS.has(ext)) continue;
      // ハーネス自身はスキャン対象外（検出パターンを文字列として持つため）
      const relPath = relative(ROOT, full).split(sep).join("/");
      if (relPath === "scripts/harness-check.mjs") continue;
      scanFile(full, relPath);
    }
  }
}

function scanFile(full, relPath) {
  let content;
  try {
    content = readFileSync(full, "utf8");
  } catch {
    return;
  }
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const p of DANGER_PATTERNS) {
      if (p.regex.test(line)) {
        errors.push(
          `[danger:${p.id}] ${relPath}:${i + 1}  ${p.message}\n    > ${line.trim()}`
        );
      }
    }
  }
}

walk(ROOT);

// 結果
if (errors.length > 0) {
  console.error("Harness static checks FAILED:\n");
  for (const e of errors) {
    console.error(" - " + e);
  }
  console.error(`\n合計 ${errors.length} 件の問題があります。修正してください。`);
  process.exit(1);
}

console.log("Harness static checks passed.");
