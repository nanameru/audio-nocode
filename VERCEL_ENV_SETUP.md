# Vercel環境変数設定ガイド

このプロジェクトをVercelにデプロイする際に必要な環境変数の設定方法です。

## 📋 必要な環境変数

### 1. Vercel Dashboardで設定

1. [Vercel Dashboard](https://vercel.com/dashboard) を開く
2. プロジェクトを選択
3. **Settings** → **Environment Variables** をクリック
4. 以下の環境変数を追加：

#### フロントエンド用（すべて必須）

```bash
# バックエンドAPI URL
NEXT_PUBLIC_API_URL=https://audio-processing-api-576239773901.us-central1.run.app

# Supabase設定（あなたのSupabaseダッシュボードから取得）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 環境の選択
各変数について、以下の環境を選択：
- ✅ **Production** - 本番環境
- ✅ **Preview** - プレビュー環境（PRなど）
- ✅ **Development** - ローカル開発環境

**注意**: `SUPABASE_SERVICE_ROLE_KEY` は **Production** のみに設定してください（セキュリティのため）。

---

## 🔧 バックエンド（Cloud Run）の設定

### 1. Cloud Run環境変数の設定

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. Cloud Run → サービス一覧 → `audio-processing-api` を選択
3. **編集とデプロイ** をクリック
4. **変数とシークレット** タブを開く
5. 以下の環境変数を追加：

```bash
# Vercelドメインを含める（あなたのVercelドメインに置き換え）
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app,http://localhost:3000
```

**注意**: `your-app.vercel.app` は実際のVercelドメインに置き換えてください。

### 2. Vercelドメインの確認方法

1. Vercel Dashboard → プロジェクト → **Deployments**
2. **Domains** セクションでドメインを確認
3. 通常は以下の形式：
   - `your-app.vercel.app`（メインドメイン）
   - `your-app-xxxxx.vercel.app`（プレビュー用）

### 3. ワイルドカードを使用

プレビューデプロイも許可する場合：
```bash
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app
```

---

## ✅ 設定後の確認

### 1. 環境変数が設定されているか確認

```bash
# Vercel CLIで確認
vercel env ls

# 特定の環境の環境変数を確認
vercel env pull .env.production.local
```

### 2. 再デプロイ

環境変数を追加/変更したら、必ず再デプロイしてください：

1. Vercel Dashboard → プロジェクト → **Deployments**
2. 最新のデプロイの右側の **...** メニューをクリック
3. **Redeploy** を選択
4. **Redeploy** ボタンをクリック

### 3. デプロイ後のテスト

1. デプロイされたアプリを開く
2. F12キーを押して開発者ツールを開く
3. **Console** タブで以下を実行：

```javascript
// 環境変数が読み込まれているか確認
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
```

---

## 🐛 トラブルシューティング

### エラー: "NEXT_PUBLIC_API_URL environment variable is not set"

**原因**: 環境変数が未設定または再デプロイしていない

**対処**:
1. Vercel Settingsで環境変数を確認
2. 環境（Production/Preview/Development）が正しく選択されているか確認
3. 再デプロイを実行

### エラー: "Failed to fetch"

**原因**: CORS設定が不足、またはAPIがアクセス不可

**対処**:
1. ブラウザコンソールでAPIリクエストURLを確認
2. Cloud RunのCORS設定を確認
3. APIのヘルスチェック: `curl https://audio-processing-api-576239773901.us-central1.run.app/health`

### エラー: "Access blocked by CORS policy"

**原因**: バックエンドのCORS設定にVercelドメインが含まれていない

**対処**:
1. Cloud Runの環境変数 `ALLOWED_ORIGINS` を確認
2. Vercelドメインを追加
3. Cloud Runを再デプロイ

---

## 📞 参考リンク

- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Google Cloud Run Environment Variables](https://cloud.google.com/run/docs/configuring/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

