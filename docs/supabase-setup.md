# Supabase セットアップ手順

このアプリは `NEXT_PUBLIC_BACKEND=supabase` で Supabase バックエンドを利用できる。
家族あたり 1 アカウントで、データは `public.family_states` テーブルに JSON ブロブで保存される。

---

## 1. プロジェクトを作る

1. https://supabase.com/dashboard でログイン → **New project**
2. プロジェクト名、リージョン（東京推奨）、データベースパスワードを設定
3. プロジェクト作成完了まで2分ほど待つ

## 2. スキーマを流し込む

1. ダッシュボード左メニュー → **SQL Editor** → **New query**
2. 本リポジトリ `supabase/schema.sql` の中身を貼り付けて **Run**
3. `family_states` テーブルが作成され、RLS とリアルタイム購読が有効になる
4. **続けてバックアップ用テーブルを作成**: 新しい query で `supabase/snapshots.sql` の中身を貼り付けて **Run**
5. `family_state_snapshots` テーブルが作成され、RLS が有効になる（直近30件のスナップショット保管に使う）

## 3. 認証設定

1. ダッシュボード左メニュー → **Authentication → Providers**
2. **Email** が Enabled になっていることを確認
3. **Confirm email** は **OFF** にする（家族用なのでメール確認をスキップ）
4. **Save**

## 4. API キーを取得

1. ダッシュボード左メニュー → **Project Settings → API**
2. 以下の2つをコピー
   - **Project URL** (例: `https://abcdefg.supabase.co`)
   - **anon public** key

## 5. 環境変数を設定

リポジトリルートに `.env.local` を作成（既にあれば追記）:

```env
NEXT_PUBLIC_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> `.env.local` は `.gitignore` 済み。コミットしない。

## 6. 起動

```powershell
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開くと AuthGate が表示される。
**初回はサインアップ**でメール+パスワードを登録すると、家族アカウントが作成される。
2台目以降のスマホでは同じメール+パスワードで**サインイン**すれば、同じ家族データが即同期される。

## 7. ローカルモードに戻したい場合

```env
NEXT_PUBLIC_BACKEND=local
```

に変更して `npm run dev`。localStorage 永続化に戻る（Supabase 接続不要）。

---

## トラブルシューティング

- **「Row Level Security」エラー** → `schema.sql` が正しく適用されているか確認。`alter publication supabase_realtime add table public.family_states` が失敗していると Realtime が動かない
- **サインアップで「Email signups are disabled」** → Auth → Providers の Email が無効
- **「Confirm your email」と言われる** → Authentication → Providers → Email の Confirm email を OFF にする
- **他端末で変更が即時反映されない** → Database → Replication → `family_states` テーブルが publication に入っているか確認
- **データを消したい** → Table Editor で `family_states` の自分の行を削除、または `supabase auth.users` で対象ユーザを削除（cascade で消える）
