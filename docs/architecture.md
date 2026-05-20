# おこづかいクエスト — アーキテクチャ & 仕様書

家族向けの「お手伝いタスク管理＋おこづかい管理」PWA。
このドキュメントは新規開発者（人間 / AI エージェント）が**コードを読む前に全体像を把握**できるよう書かれている。

---

## 1. 概要

### 何をするアプリか

- **親**が子供のお手伝いタスクを登録 → **子供**が完了申請 → 親が承認 → **おこづかいに反映**
- 子供は溜まったおこづかいで「ごほうび」と交換できる
- 親は「未払い額」を見ながら、実際に現金を渡したらタスクを「支払い済み」にチェック
- バッジ・レベル・連続達成日数（streak）でゲーミフィケーション

### ユーザー種別

| 役割 | 説明 | 認証方式 |
|---|---|---|
| 親（ママ・パパ） | 家族アカウントの所有者 | Supabase メール+パスワード |
| 子供（1〜4人） | プロフィールとして登録 | 専用認証なし。親アカウント内のプロフィール |
| **親モード**入る時 | 4桁 PIN 必須（ペアレンタルロック） | クライアント側で SHA-256 ハッシュ検証 |

---

## 2. 技術スタック

| 層 | 採用技術 | 理由 |
|---|---|---|
| Framework | Next.js 15 (App Router) | Vercel デプロイ容易、PWA 対応 |
| Language | TypeScript (strict) | 型安全 |
| UI | React 19 + Tailwind CSS 3 | スマホファースト、迅速な実装 |
| バックエンド | Supabase | Auth + Realtime + Postgres を一括 |
| データ同期 | Postgres JSONB + Realtime | 家族あたり 1 行の JSON ブロブ |
| 状態管理 | React Context + useReducer 風 useState | 軽量、依存追加なし |
| PWA | Service Worker + manifest.json | オフライン対応、ホーム画面追加 |
| ホスティング | Vercel（自動デプロイ）| GitHub 連携で `git push` だけで反映 |

**依存しているライブラリ**: `next`, `react`, `react-dom`, `@supabase/supabase-js` のみ。それ以外の機能（紙吹雪・効果音・PIN ハッシュ・PNG 生成）は全部標準 API で自前実装。

---

## 3. ファイル構成

```
こずかい/
├─ app/                          # Next.js App Router
│  ├─ layout.tsx                 # ルートレイアウト + Service Worker 登録
│  ├─ page.tsx                   # ルートページ（AuthGate → Onboarding → UserSwitch → Child/Parent）
│  └─ globals.css                # Tailwind + 共通スタイル
│
├─ components/                   # UI コンポーネント
│  ├─ AuthGate.tsx               # サインイン/サインアップ画面（backend=supabase のみ）
│  ├─ Onboarding.tsx             # 初回セットアップ（子供登録 + PIN）
│  ├─ UserSwitch.tsx             # プロフィール選択画面（親は PIN ロック）
│  ├─ ChildApp.tsx               # 子供向け全画面（ホーム/クエスト/ごほうび/履歴/マイページ）
│  ├─ ParentApp.tsx              # 親向け全画面（ダッシュボード/タスク/承認/履歴/設定）
│  ├─ Avatar.tsx                 # 絵文字 or data URL を表示する共通アバター
│  ├─ PinPad.tsx                 # 4桁 PIN 入力 UI（入力/設定モード兼用）
│  ├─ BottomNav.tsx              # 子供/親共通の下部ナビ
│  ├─ Toast.tsx                  # 画面上部スライドトースト
│  ├─ InstallButton.tsx          # PWA インストールボタン（Chrome/iOS 別）
│  └─ PhoneFrame.tsx             # （未使用）スマホフレーム装飾
│
├─ lib/                          # ビジネスロジック・データ層
│  ├─ types.ts                   # 全データモデル（AppState 含む）
│  ├─ store.tsx                  # ★中心。Context Provider + 全アクション
│  ├─ demoData.ts                # createDemoState() / createEmptyState()
│  ├─ dailyRollover.ts           # 日跨ぎ処理（daily/weekly タスク再生成、streak 更新）
│  ├─ badges.ts                  # 承認時のバッジ自動付与判定
│  ├─ pin.ts                     # SHA-256 + salt の PIN ハッシュ
│  ├─ notify.ts                  # Web Notification API ラッパー
│  ├─ effects.ts                 # 紙吹雪 + WebAudio 効果音
│  ├─ imageResize.ts             # アバター用画像リサイズ (Canvas)
│  ├─ date.ts                    # ローカルタイム基準の日付ヘルパ
│  ├─ supabaseClient.ts          # Supabase クライアントのシングルトン
│  └─ api/                       # データアダプタ層（差し替え可能）
│     ├─ types.ts                # DataAdapter インタフェース
│     ├─ local.ts                # localStorage 実装
│     ├─ supabase.ts             # Supabase 実装（JSON ブロブ + Realtime）
│     └─ index.ts                # 環境変数で切替
│
├─ public/                       # 静的ファイル
│  ├─ manifest.json              # PWA manifest
│  ├─ sw.js                      # Service Worker
│  ├─ offline.html               # SW のオフライン fallback
│  ├─ icon.svg                   # 元アイコン
│  ├─ icon-192.png               # 192x192 PNG（gen-icons.mjs で生成）
│  └─ icon-512.png               # 512x512 PNG
│
├─ supabase/
│  └─ schema.sql                 # Supabase テーブル定義 + RLS + Realtime publication
│
├─ scripts/
│  ├─ harness-check.mjs          # 静的チェック（必須）
│  └─ gen-icons.mjs              # PNG アイコン生成（依存なし、純 zlib）
│
├─ docs/
│  ├─ architecture.md            # 本ドキュメント
│  ├─ harness.md                 # 開発ハーネスの説明
│  └─ supabase-setup.md          # Supabase 接続手順
│
├─ .claude/harness/              # Claude Code 用の checklist
├─ CLAUDE.md                     # Claude Code 用ルール
├─ package.json
├─ tsconfig.json
├─ tailwind.config.ts
├─ postcss.config.js
├─ next.config.mjs
├─ next-env.d.ts
└─ .env.local.example            # 環境変数サンプル
```

---

## 4. データモデル

`lib/types.ts` に全部入っている。Supabase の `family_states.state` カラムにこれ全体が JSON で保存される。

### AppState（root）

```ts
interface AppState {
  currentUserId: string | null;   // ★端末ローカルのみ。Supabase には保存しない
  parentPin?: ParentPin;          // 未設定なら Onboarding を起動
  lastRolloverDate?: string;      // YYYY-MM-DD（ローカル）
  lastReminderDate?: string;      // リマインダ重複防止
  taskOrder?: string[];           // 並び順保持用（未使用）

  users: User[];
  tasks: Task[];
  history: AllowanceHistory[];
  notifications: Notification[];
  rewards: RewardItem[];
  badges: Badge[];
  taskTemplates: TaskTemplate[];
  redemptions: RedemptionRequest[];
  settings: NotificationSettings;
}
```

### 主要 sub-types

| 型 | 主要フィールド | メモ |
|---|---|---|
| `User` | id, name, role: "child" \| "father" \| "mother", avatar(string), level, xp, xpToNext, streakDays, allowanceBalance | avatar は絵文字 or `data:image/jpeg;...` |
| `Task` | id, title, icon, reward, requesterId, assignedChildId, status: "active"\|"submitted"\|"approved"\|"rejected", dueDate, repeatType: "today"\|"daily"\|"weekly"\|"none", weekdays:number[], memo, createdAt | weekdays は 0=日 .. 6=土 |
| `AllowanceHistory` | id, childId, taskId?, **redemptionId?**, title, amount(±), type: "earn"\|"spend"\|"paid", status: "approved"\|"pending"\|"cancelled", createdAt, paidAt? | paidAt は親が現金で渡した日 |
| `Notification` | id, userId (\| "all"), title, message, type: "task"\|"approval"\|"reminder"\|"system", isRead, createdAt | |
| `RewardItem` | id, title, icon, cost, stock? | |
| `RedemptionRequest` | id, childId, rewardId, cost, status: "pending"\|"confirmed"\|"cancelled", createdAt | 履歴とは redemptionId で 1:1 |
| `Badge` | id, title, icon, description, acquired | 4種固定 |
| `TaskTemplate` | id, title, icon, reward, usedCount? | usedCount 降順で表示 |
| `ParentPin` | hash, salt | SHA-256(salt+pin) の hex |
| `NotificationSettings` | push, onNewTask, onSubmit, onApproval, reminder, streak, reminderTime("HH:MM") | |

---

## 5. データ永続化

### アダプタ層（`lib/api/`）

`DataAdapter` インタフェースを介して `local` / `supabase` を切替。`NEXT_PUBLIC_BACKEND` 環境変数で決まる:

```ts
interface DataAdapter {
  getSession(): Promise<Session | null>;
  onAuthChange(cb): () => void;
  signIn(email, password): Promise<void>;
  signUp(email, password): Promise<void>;
  signOut(): Promise<void>;

  loadState(): Promise<AppState | null>;
  saveState(state: AppState): Promise<void>;
  clear(): Promise<void>;

  subscribe(onChange: (state: AppState) => void): () => void;
}
```

### Supabase スキーマ

家族あたり **1 行の JSON ブロブ**で全データを保存（`supabase/schema.sql`）:

```sql
create table public.family_states (
  family_id  uuid primary key references auth.users(id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);
-- RLS: auth.uid() = family_id のみ
-- Realtime: publication に追加済み
```

メリット: 既存 `loadState/saveState` API と相性◎、Realtime も 1 行を watch するだけ
デメリット: 行サイズが MB 級になると非効率（家族用途では問題なし）

### Realtime 同期のトリック

両端末の **エコーループ**を 2 段階で防ぐ:

1. **`_meta.client` (UUID)**: 保存ペイロードに自分のクライアント ID を埋め込み、`subscribe` で受信したエコーが自分のものなら無視
2. **`remoteSnapshotRef` (参照比較)**: リモート由来の `setState` で記録した参照と現在の state を `===` 比較。一致なら save スキップ、別参照（ローカル操作で setState されている）なら save 実行

これで「ローカル操作 → 保存 → 他端末に反映」のフローはちゃんと動きつつ、エコーで無限ループしない。

### `currentUserId` は端末ローカル

「誰がログイン中か」は端末ごとに違うので **Supabase には保存しない**:
- `useState<string | null>(null)` で管理
- `localStorage` の `okq-local-current-user` キーに保存（リロード後の復元用）
- realtime 受信時に `state.currentUserId` を `null` で上書き

---

## 6. 主要フロー

### 6.1 起動シーケンス（`app/page.tsx::Page` → `Shell`）

```
backend === "supabase"?
   Yes → <AuthGate> 経由
   No  → そのまま StoreProvider

StoreProvider hydrate:
   1. api.loadState() で復元
   2. rolloverIfNeeded(base) で日跨ぎ処理
   3. setState(rolled), setHydrated(true)
   4. api.subscribe() で realtime 起動

Shell の表示判定:
   if (!hydrated)        → 「読み込み中…」
   else if (needsOnboarding) → <Onboarding />     ※ parentPin が未設定
   else if (!currentUser) → <UserSwitch />
   else if (role === "child") → <ChildApp />
   else                      → <ParentApp />
```

### 6.2 オンボーディング

1. 子供の人数（1〜4）
2. 各子供の名前 + アバター（絵文字プリセット9種 or 写真アップロード）
3. 4桁 PIN を 2回入力
4. `completeOnboarding(children, pin)` → `createEmptyState()` をベースに子供を追加 + `parentPin` をハッシュ保存 → `parentUnlocked = true` → UserSwitch へ

### 6.3 親プロフィール解錠

```
UserSwitch::choose(userId, role)
  if role === "child"        → setCurrentUser(id) 即遷移
  else if parentUnlocked      → setCurrentUser(id) 即遷移
  else                        → PinPad モーダル → verifyPinAndUnlock(pin)
                                成功で setCurrentUser(id) + parentUnlocked = true
```

`parentUnlocked` は **useState のみ**（永続化しない）。リロードで自動的にロックされる。

### 6.4 タスク承認フロー

1. 子供: 「できた！」タップ → `submitTask(id)` → status: submitted + 親に通知
2. 親: 承認待ち画面で「承認する」 → `approveTask(id)` 実行:
   - users[child].allowanceBalance += task.reward
   - users[child].xp 加算 → レベルアップ判定
   - history に earn 履歴を追加（paidAt なし）
   - status: approved
   - 子供への通知 + バッジ判定 (`evaluateBadges`)
   - 紙吹雪 + 効果音

### 6.5 ごほうび交換フロー

1. 子供: ごほうび一覧で「こうかん」 → 確認シート → `redeemReward(childId, rewardId)`
   - 残高チェック → 残高減算
   - `RedemptionRequest` (pending) と spend `AllowanceHistory` (pending) を作成。**redemptionId で紐付け**
   - 親に通知
2. 親: 承認待ちの「ごほうび交換申請」セクション
   - 「受渡し完了」 → `confirmRedeem(rid)` → 該当 history を `status: approved` に
   - 「取消（返金）」 → `cancelRedeem(rid)` → 残高戻し + 該当 history を `status: "cancelled"` に（削除はしない）

### 6.6 支払い管理

- 親ダッシュボードに「💰 未払いのおこづかい」セクション
- 子供別に `history.filter(h => type==="earn" && status==="approved" && !paidAt)` の合計を表示
- タップで `PaymentDetailsModal` → 未払い earn 一覧（チェックボックス）
- 「選択分を支払い済みに」 → `markPaid(ids)` で `paidAt = todayLocal()` を埋める
- `allowanceBalance`（仮想残高）は触らない設計。`paidAt` は別軸の記録

### 6.7 日跨ぎ処理 (`lib/dailyRollover.ts`)

起動時、`lastRolloverDate !== todayLocal()` のときに `rolloverIfNeeded` が実行:

1. 既存タスクで `repeatType: "daily"` / `"weekly"` のものをテンプレート扱い
2. 今日まだ同タイトル + 同担当のタスクが無ければ `active` で再生成
3. `weekly` は `weekdays` に今日の曜日が含まれる場合のみ
4. 各子供の前日 approved 履歴の有無で `streakDays` を +1 or 0 リセット
5. `lastRolloverDate = today` に更新（重複実行防止）

### 6.8 リマインダー（`lib/store.tsx` 内 setInterval）

- 1分ごとに現在時刻と `settings.reminderTime` を比較
- 一致し、`settings.reminder === true` で、今日の active タスクがある子供にアプリ内通知 + OS 通知（`fireOSNotification`）
- 同日内の重複発火を `lastReminderDate` で防ぐ

---

## 7. 環境変数

`.env.local`（git管理外）に設定:

```env
# データバックエンド ("local" | "supabase")
NEXT_PUBLIC_BACKEND=supabase

# Supabase 接続情報
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

- `local` モードでは認証もキャッシュもブラウザの localStorage のみ。AuthGate もバイパス
- `supabase` モードでは AuthGate でメール+パスワード認証必須

---

## 8. 開発・起動コマンド

```powershell
# 初回
npm install

# 開発サーバ
npm run dev               # → http://localhost:3000

# 静的チェック（コミット前必須）
npm run harness:check     # node scripts/harness-check.mjs + tsc --noEmit

# 本番ビルド確認
npm run build
npm run start

# PNG アイコン再生成（必要なときのみ）
npm run gen-icons         # public/icon-192.png + icon-512.png

# 単体での型チェック
npm run typecheck
```

### ハーネスチェック

`scripts/harness-check.mjs` は以下を確認:
- 必須ファイルの存在
- `console.log` の数（過剰でないか）
- TODO の数（過剰でないか）
- `eval` / `new Function` の使用禁止

詳細は `docs/harness.md` を参照。

---

## 9. デプロイ

GitHub → Vercel 連携で自動デプロイされる:

```
git push origin main  →  Vercel が約2分後にビルド & デプロイ
```

本番 URL: `https://okozukai-quest.vercel.app/`

Vercel 環境変数（Production / Preview 両方）に `.env.local` と同じ3つを設定済み。

---

## 10. PWA 構成

### Service Worker (`public/sw.js`)

- **navigation request** (HTML): network-first → 失敗時のみキャッシュ → 最終 fallback で `offline.html`
- **静的アセット** (JS/CSS/画像): cache-first + 背景更新
- 新版がインストールされても **強制リロードしない**（使用中のタブが中断されるのを防ぐ）
- 次回タブを開き直したときに自然に切り替わる
- `updateViaCache: 'none'` で sw.js 自体のブラウザキャッシュは無効化

### Manifest (`public/manifest.json`)

- アイコン: 192/512 PNG + SVG（maskable）
- display: standalone（フルスクリーン PWA）
- theme_color: `#B89CE6`（紫系）

### インストール UI (`components/InstallButton.tsx`)

- Chrome/Android: `beforeinstallprompt` を捕まえてボタン表示
- iOS Safari: UA 判定 → 「共有 → ホーム画面に追加」の手順モーダル
- standalone モード時: 表示しない

---

## 11. 制約・既知の挙動

### CRDT じゃないので…

- **同時編集の衝突**: 別端末で完全同時に同じフィールドを変更すると、**last-write-wins**。後に保存した方が勝つ。家族用途では実害ほぼなし
- **オフライン中の変更**: 他端末でしばらく操作した後オンライン復帰すると、サーバ側の最新で上書きされる可能性

### ペアレンタルロック

- PIN は **クライアント側で SHA-256 + salt** ハッシュ。サーバには平文で送らない
- ただし「子供がアプリのソースを覗いて hash を比較できる」レベルの保護で、暗号学的に強固ではない（家族用途の十分な抑止）

### 通知

- **OS 通知**は `Notification` API のみ。Web Push（バックグラウンド）は未実装
- アプリ起動中のみ通知が出る
- iOS Safari は PWA ホーム画面追加後のみ通知が動く（制約あり）

### 写真アバター

- Canvas で 128×128 JPEG 70% にリサイズしてから data URL で state に埋め込み
- 1枚あたり 10〜20 KB。Supabase JSONB の制限内
- 巨大な元画像は 10MB で reject

---

## 12. テスト方針（Codex 等で動かす場合）

### A. ローカルモードで動作確認（Supabase 不要）

```powershell
# .env.local を一旦ローカルモードに
echo NEXT_PUBLIC_BACKEND=local > .env.local
npm install
npm run dev
```

→ http://localhost:3000 を開く → オンボーディングから動作確認。データは localStorage に保存される。

### B. 主要動作シナリオ

1. **オンボーディング**: 子供1人 + PIN「1234」設定 → UserSwitch 表示
2. **タスク追加**: 親モードに PIN 入って → 設定済みテンプレから「リビング掃除機」→ 担当の子供を選択 → 保存
3. **完了申請 → 承認**: 子供で「できた！」→ 親で承認 → 残高が増える
4. **ごほうび交換**: 子供で「おかしパーティー (500円)」を交換 → 親側「承認待ち」に交換申請が現れる → 受渡し完了
5. **未払い管理**: 親ダッシュボード「💰 未払い」 → タップ → 未払いタスクを選んで「支払い済みに」
6. **PIN ロック**: 親モード設定で「親モードを終了」 → UserSwitch → 親アバターが 🔒 → 再度 PIN 要求
7. **リセット**: 設定 →「全データを初期化」→ 二重 confirm → オンボーディングへ
8. **写真アバター**: 設定 → 家族のプロフィール → 子供を選択 → 「写真を選ぶ」で画像アップロード

### C. Supabase 接続テスト

```powershell
# .env.local を supabase モードに
# docs/supabase-setup.md に従ってプロジェクト作成 + schema.sql 適用 + 環境変数設定

npm run dev
```

→ AuthGate でサインアップ。別ブラウザで同じアカウントにサインインして realtime 同期を確認。

### D. ビルドチェック

```powershell
npm run harness:check  # 静的チェック + tsc --noEmit。必ず先に
npm run build          # Next.js 本番ビルド
```

`harness:check` がパスすれば、型エラー・必須ファイル欠落・eval 混入は無い。

### E. 自動テストは未実装

このプロジェクトは**ユニット/E2E テストフレームワークを導入していない**。
追加するなら:
- ユニット: Vitest（`lib/` の純関数 `dailyRollover.ts`, `badges.ts`, `pin.ts`, `date.ts` 等から始めるのが良い）
- E2E: Playwright（ローカルモードでフロー確認）

---

## 13. 開発上の注意（CLAUDE.md より抜粋）

- 変更前に関連ファイルを必ず読む。**推測で書かない**
- 最小限の差分で実装する。周辺の整理・改名・抽象化を勝手にしない
- 大規模リファクタリングは明示指示があるときのみ
- 既存スクリプトを破壊しない。`package.json` の変更は追記中心
- 機密情報は `.env.local` で扱い、コミットしない
- `eval` / `new Function` 禁止
- 明確な理由なく外部通信を追加しない

---

## 14. 主要なバグ修正履歴（参考）

| Commit | 修正内容 |
|---|---|
| `currentUserId` を端末ローカル化 | 全端末で「誰がログイン中か」まで同期されていたバグ |
| Realtime エコー無視 (`_meta.client`) | JSONB のキー順正規化で hash が不一致 → 自エコーが「他端末からの変更」と誤検出 |
| `remoteSnapshotRef` での参照比較 | リモート反映 → save → echo → save の無限ループ／同時編集時のロス |
| `redemptionId` で履歴1:1紐付け | 同額の pending 交換が複数あるとき confirm が全件に波及 |
| `cancelled` ステータス導入 | cancelRedeem で履歴を削除していた問題 |
| SW network-first navigation | 古い HTML が serve され続けるキャッシュ問題 |
| SW skipWaiting を廃止 | 強制リロードでチラつき・「画面が戻る」 |

---

## 15. ロードマップ（範囲外として記録）

| 優先 | 内容 |
|---|---|
| 中 | 月次レポート/グラフ |
| 中 | 複数親アカウント（パパ・ママそれぞれ別アカウントで同じ家族データ） |
| 中 | Web Push 本実装（Supabase Functions + VAPID） |
| 低 | PIN 忘れリカバリ |
| 低 | 親モード自動ロック（無操作 N 分） |
| 低 | iOS PWA の通知制約対応 |
| 低 | 写真の Supabase Storage 移行（data URL 集計でブロブが大きくなったら） |
| 低 | CRDT 化（同時編集の競合解決） |

---

## 16. 参考リンク

- 本番: https://okozukai-quest.vercel.app/
- リポジトリ: https://github.com/Shingo600/okozukai-quest
- Supabase セットアップ: [`docs/supabase-setup.md`](./supabase-setup.md)
- ハーネス: [`docs/harness.md`](./harness.md)
