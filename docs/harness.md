# Claude Code 標準ハーネス

## 目的

Claude Code が毎回安定した品質で開発できるように、作業ルール・実装チェック・レビュー確認・セキュリティ確認・自動チェックを標準化する軽量フレームワーク。

「賢さ」ではなく「再現性」を担保することが目的。

---

## ファイル構成と役割

| ファイル | 役割 |
| --- | --- |
| `CLAUDE.md` | プロジェクトのトップルール。Claude Code が最初に読む。 |
| `docs/harness.md` | ハーネス全体の設計説明（このファイル）。 |
| `.claude/harness/implementation-checklist.md` | 実装前後に必ず確認する項目。 |
| `.claude/harness/review-checklist.md` | 自己レビュー時の確認項目。 |
| `.claude/harness/security-checklist.md` | セキュリティ観点の確認項目。 |
| `scripts/harness-check.mjs` | ハーネス静的検査スクリプト。`npm run harness:check` から呼ばれる。 |

---

## Claude Code の基本作業ループ

1. `CLAUDE.md` を読む。
2. 関連ファイル（型・呼び出し元・周辺コンポーネント）を確認する。
3. 最小差分で実装する。
4. `.claude/harness/implementation-checklist.md` をセルフチェック。
5. `npm run harness:check` を実行（静的チェック + `tsc --noEmit`）。
6. 本番影響があれば `npm run build` も実行。
7. `.claude/harness/review-checklist.md` と `security-checklist.md` で最終確認。
8. 変更ファイル・確認結果・残リスクを日本語で報告。

---

## ハーネスを拡張するタイミング

以下の状況が発生したら、ハーネスを拡張することを検討する。

- 同じ種類のミス・回帰が複数回発生した → チェックリストに項目追加。
- プロジェクトに新しいレイヤー（API ルート、DB、外部サービス連携）が増えた → 専用チェック追加。
- セキュリティ事故・ヒヤリハットがあった → `security-checklist.md` と `harness-check.mjs` の検出ルールを更新。
- テスト基盤が整ったら、`harness:check` にテスト実行を追加する。

最初から完璧を狙わず、運用しながら少しずつ厚くしていく。

---

## セキュリティもハーネスの一部

セキュリティは「別レイヤー」ではなく、ハーネスの基本機能の一部として扱う。

- `security-checklist.md` を毎回確認する。
- `harness-check.mjs` が危険パターン（`eval`, `new Function`, 機密ログなど）を検出する。
- 新規依存関係・新規外部通信は必ず理由を明記する。

セキュリティ違反は「動けば良い」では済まない領域なので、自動検査と人間（Claude）の確認の二段構えで防ぐ。
