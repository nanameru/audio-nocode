# Vercelデプロイエラーログの確認方法

## 🔍 ログの確認場所

### 1. **ビルドログ**
1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクトを選択
3. **Deployments** タブをクリック
4. 該当するデプロイをクリック
5. **Building** セクションを展開 → ビルドログが表示

### 2. **ランタイムログ（実行時エラー）**
1. デプロイの詳細画面で **Functions** タブをクリック
2. エラーが発生している関数を選択
3. **Logs** を確認

### 3. **リアルタイムログ（推奨）**
```bash
# Vercel CLIをインストール
npm install -g vercel

# プロジェクトにログイン
vercel login

# リアルタイムログを表示
vercel logs --follow
```

### 4. **ブラウザコンソールで確認**
1. デプロイされたアプリを開く
2. F12キーを押して開発者ツールを開く
3. **Console** タブでエラーメッセージを確認
4. **Network** タブでAPIリクエストの失敗原因を確認
   - リクエストURLが正しいか
   - ステータスコード（CORS: 403/405, API停止: 502/504）
   - レスポンスヘッダーを確認

---

## ⚙️ Vercel環境変数の設定

### 設定手順
1. [Vercel Dashboard](https://vercel.com/dashboard) を開く
2. プロジェクトを選択
3. **Settings** → **Environment Variables** をクリック
4. 以下の環境変数を追加：

| 変数名 | 値 | 環境 |
|--------|-----|------|
| `NEXT_PUBLIC_API_URL` | `https://audio-processing-api-576239773901.us-central1.run.app` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_URL` | あなたのSupabase URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | あなたのSupabase Anon Key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | あなたのSupabase Service Role Key | Production のみ |

5. 保存後、**Redeploy** ボタンをクリックして再デプロイ

### 注意事項
- `NEXT_PUBLIC_` で始まる環境変数はクライアントサイドで使用可能
- `NEXT_PUBLIC_` なしの変数はサーバーサイドのみ
- 環境変数を追加/変更したら必ず再デプロイが必要

---

## 🔧 CORS問題の解決

バックエンド（Cloud Run）のCORS設定にVercelドメインを追加する必要があります。

### あなたのVercelドメインを確認
1. Vercel Dashboard → Deployments
2. **Domains** セクションで確認（例：`your-app.vercel.app`）

### Cloud Run環境変数に追加
```bash
# Cloud Runコンソールで環境変数を追加
ALLOWED_ORIGINS=http://localhost:3000,https://your-app.vercel.app,https://your-app-*.vercel.app
```

または、バックエンドコードを修正：

```python
# api/app/main.py
import os

# Vercelドメインを含める
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "").split(",") + [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## ✅ 確認チェックリスト

- [ ] Vercel環境変数を設定した
- [ ] 環境変数設定後に再デプロイした
- [ ] ブラウザコンソールでAPIリクエストURLを確認した
- [ ] Cloud RunのCORS設定にVercelドメインを追加した
- [ ] Cloud RunのAPIがアクセス可能か確認（`curl`でテスト）

---

## 🐛 よくあるエラーと対処法

### エラー: "Failed to fetch"
**原因**: CORS設定、ネットワークエラー、APIダウン
**対処**: 
1. ブラウザコンソールで詳細を確認
2. APIのヘルスチェック: `https://your-api.run.app/health`
3. CORS設定を確認

### エラー: "NEXT_PUBLIC_API_URL environment variable is not set"
**原因**: 環境変数が未設定
**対処**: Vercel Settingsで環境変数を設定して再デプロイ

### エラー: "Access to fetch at ... from origin ... has been blocked by CORS"
**原因**: CORS設定が不足
**対処**: バックエンドのCORS設定にVercelドメインを追加

---

## 📞 サポート

問題が解決しない場合：
1. ブラウザのコンソールログをスクリーンショット
2. Vercelのデプロイログをコピー
3. エラーメッセージの全文を共有

