# CLAUDE.md

このファイルは Claude Code がこのリポジトリで作業する際の標準ルールを定義する。
作業を始める前に必ず読むこと。

---

## 1. Project Intent

- このプロジェクトは Next.js / React / TypeScript 構成のアプリケーション。
- Claude Code が安定して開発を継続できるよう、軽量な標準ハーネスを備える。
- 開発方針:
  - 既存構成・命名・スタイルを尊重し、最小差分で改修する。
  - 大規模リファクタリングは明示指示があるときのみ行う。
  - 不明点があれば実装より先に確認する。

---

## 2. Working Rules

- 変更前に関連ファイルを必ず読む。推測で書かない。
- 最小限の差分で実装する。周辺の整理・改名・抽象化を勝手に行わない。
- 既存の構造・命名・CSS・型定義を優先する。
- 不要な依存関係を追加しない。追加する場合は理由を明記する。
- 大規模リファクタリングは、ユーザーから明示指示があった場合のみ行う。
- 既存スクリプトを破壊しない。`package.json` の変更は追記中心に行う。

---

## 3. Default Loop

Claude Code は毎回この順序で作業する。

1. `CLAUDE.md` を読む。
2. 関連ファイル（型定義・周辺コンポーネント・呼び出し元）を確認する。
3. 最小限の差分で実装する。
4. `npm run harness:check` を実行する。
5. 本番影響がある変更（ビルド成果物・ルーティング・依存関係など）の場合は `npm run build` も実行する。
6. 変更ファイル一覧・確認結果（コマンド出力）・残リスクを **日本語で** 要約して報告する。

---

## 4. Security Rules

- API キー・トークン・パスワード・認証情報をコードに直書きしない。
- 秘密情報は環境変数（`.env.local` など）で扱う。
- `.env` / `.env.local` をコミット対象に含めない。
- 機密情報を `console.log` で出力しない。
- 明確な理由なく外部通信（fetch / 外部 API 呼び出し）を追加しない。
- `eval` / `new Function` などの動的コード実行は使わない。
- ユーザーデータ・保存データを破壊的に変更しない（マイグレーションは明示指示時のみ）。
- 新規依存関係は **目的・選定理由** を必ず説明する。

---

## 5. 詳細

- ハーネス全体像: [docs/harness.md](docs/harness.md)
- 実装チェックリスト: [.claude/harness/implementation-checklist.md](.claude/harness/implementation-checklist.md)
- レビューチェックリスト: [.claude/harness/review-checklist.md](.claude/harness/review-checklist.md)
- セキュリティチェックリスト: [.claude/harness/security-checklist.md](.claude/harness/security-checklist.md)
