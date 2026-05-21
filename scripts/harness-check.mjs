#!/usr/bin/env node
// Claude Code 標準ハーネス静的チェック
// 必須ファイル存在チェック + 危険パターンスキャン + 過去バグ由来の検出ルール

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
  ".env.local.example",
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

// ---- 閾値設定 ----
// 開発残骸（console.log）の許容上限。これを超えるとエラー扱い。
const CONSOLE_LOG_MAX = 20;

const errors = [];
const warnings = [];

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
    if (!pkg.scripts || typeof pkg.scripts.typecheck !== "string") {
      errors.push(`[package-json] package.json に "scripts.typecheck" が定義されていません。`);
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
    level: "error",
  },
  {
    id: "new-function",
    regex: /\bnew\s+Function\s*\(/,
    message: "new Function( を使用しています。動的コード実行は禁止です。",
    level: "error",
  },
  {
    id: "console-log-process-env",
    regex: /console\.log\s*\(\s*process\.env\b/,
    message: "console.log(process.env...) は環境変数の漏洩につながります。",
    level: "error",
  },
  {
    id: "console-log-secret",
    regex: /console\.log\s*\([^)]*\b(token|secret|password|apiKey|API_KEY)\b/i,
    message: "console.log に token/secret/password/apiKey/API_KEY が含まれています。機密情報を出力していないか確認してください。",
    level: "error",
  },
  {
    id: "jwt-literal",
    // `eyJ` で始まる長い base64-url 風文字列（JWT, anon key 等の誤コミット検出）
    regex: /["'`]eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    message: "JWT 風のリテラル文字列が含まれています。Supabase anon key 等をコミットしていないか確認してください（.env.local へ）。",
    level: "error",
  },
  {
    id: "setstate-closure-in-timer",
    // setTimeout / setInterval の引数アロー関数の本体で state を直接参照する匂い
    // (簡易検出: 同一行に setTimeout/setInterval と state 参照が共起する場合)
    regex: /\b(setTimeout|setInterval)\s*\([^)]*\bstate\b/,
    message: "setTimeout/setInterval の中で state を直接参照しているように見えます。クロージャに古い state が焼き付くため、useRef 経由で最新値を参照してください（v0.2.1 で同種バグを修正）。",
    level: "warn",
  },
];

let consoleLogCount = 0;

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

    // console.log 出現を集計（コメント行はざっくり除外）
    const trimmed = line.trim();
    if (!trimmed.startsWith("//") && !trimmed.startsWith("*")) {
      if (/\bconsole\.log\s*\(/.test(line)) consoleLogCount += 1;
    }

    for (const p of DANGER_PATTERNS) {
      if (p.regex.test(line)) {
        const target = p.level === "warn" ? warnings : errors;
        target.push(
          `[${p.level}:${p.id}] ${relPath}:${i + 1}  ${p.message}\n    > ${line.trim()}`
        );
      }
    }
  }
}

walk(ROOT);

// 4. console.log 件数の閾値判定
if (consoleLogCount > CONSOLE_LOG_MAX) {
  errors.push(
    `[console-log-overload] console.log が ${consoleLogCount} 箇所あります（上限 ${CONSOLE_LOG_MAX}）。開発残骸を整理してください。`
  );
} else if (consoleLogCount > 0) {
  // 情報出力のみ
  console.log(`(info) console.log は ${consoleLogCount} 箇所（上限 ${CONSOLE_LOG_MAX}）`);
}

// 結果
if (warnings.length > 0) {
  console.warn("Harness warnings:\n");
  for (const w of warnings) console.warn(" - " + w);
  console.warn(""); // 空行
}

if (errors.length > 0) {
  console.error("Harness static checks FAILED:\n");
  for (const e of errors) {
    console.error(" - " + e);
  }
  console.error(`\n合計 ${errors.length} 件のエラー / ${warnings.length} 件の警告があります。`);
  process.exit(1);
}

console.log("Harness static checks passed.");
if (warnings.length > 0) {
  console.log(`(警告 ${warnings.length} 件あり。可能なら対処してください)`);
}
