# 🚀 Audio Processing Studio セットアップガイド

pyannote.ai統合Pythonバックエンドの完全セットアップガイド

## 📋 前提条件

- Python 3.8+ インストール済み
- Node.js 18+ インストール済み
- pyannote.ai APIキー取得済み

## 🔑 pyannote.ai APIキー取得

1. [pyannote.ai Dashboard](https://dashboard.pyannote.ai) にアクセス
2. アカウント作成/ログイン
3. **API Keys** セクションでキー生成
4. 生成されたキーをコピー（後で使用）

## 🛠️ バックエンドセットアップ

### 1. Python環境準備

```bash
# プロジェクトディレクトリに移動
cd audio-processing-studio

# Python仮想環境作成
python -m venv backend/venv

# 仮想環境アクティベート
# Linux/Mac:
source backend/venv/bin/activate
# Windows:
backend\venv\Scripts\activate

# 依存関係インストール
cd backend
pip install -r requirements.txt
```

### 2. 環境変数設定

```bash
# .envファイル作成
cp env.example .env

# .envファイル編集
nano .env  # または任意のエディタ
```

**重要**: `.env`ファイルに以下を設定:

```env
# pyannote.ai API Configuration
PYANNOTE_API_KEY=your_actual_api_key_here
PYANNOTE_BASE_URL=https://api.pyannote.ai/v1

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=true

# File Upload Configuration
UPLOAD_DIR=./uploads
TEMP_DIR=./temp
MAX_FILE_SIZE=100MB

# Webhook Configuration
WEBHOOK_BASE_URL=http://localhost:8000
WEBHOOK_SECRET=your_webhook_secret_here

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### 3. バックエンド起動

```bash
# 開発サーバー起動
python -m app.main

# または
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**確認**: http://localhost:8000/docs でAPI仕様確認

## 🎨 フロントエンドセットアップ

### 1. 依存関係インストール

```bash
# プロジェクトルートに戻る
cd ..

# Node.js依存関係インストール
npm install
```

### 2. 環境変数設定

```bash
# .env.localファイル作成
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

### 3. フロントエンド起動

```bash
# 開発サーバー起動
npm run dev
```

**確認**: http://localhost:3000 でフロントエンド確認

## 🐳 Docker使用（オプション）

### 全体起動

```bash
# Docker Compose起動
docker-compose up -d

# ログ確認
docker-compose logs -f
```

### 個別起動

```bash
# バックエンドのみ
docker-compose up backend redis

# フロントエンドのみ
docker-compose up frontend
```

## ✅ 動作確認

### 1. バックエンドAPI確認

```bash
# Health Check
curl http://localhost:8000/health

# pyannote.ai接続確認
curl http://localhost:8000/api/diarization/test
```

**期待される応答**:
```json
{
  "status": "success",
  "message": "pyannote.ai API connection successful",
  "api_key_valid": true
}
```

### 2. フロントエンド確認

1. http://localhost:3000 にアクセス
2. モジュールライブラリで「pyannote話者分離」モジュール確認
3. ドラッグ&ドロップでキャンバスに配置

### 3. 統合テスト

```bash
# 音声ファイルアップロードテスト
curl -X POST "http://localhost:8000/api/diarization/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@path/to/audio.wav" \
  -F "wait_for_completion=false"
```

## 🔧 トラブルシューティング

### よくある問題

#### 1. pyannote.ai API Key エラー

```
❌ Error: Invalid pyannote.ai API key
```

**解決策**:
- `.env`ファイルの`PYANNOTE_API_KEY`確認
- [Dashboard](https://dashboard.pyannote.ai)でキー有効性確認
- キーに余分なスペースがないか確認

#### 2. CORS エラー

```
❌ Error: CORS policy blocked
```

**解決策**:
- `ALLOWED_ORIGINS`にフロントエンドURLを追加
- バックエンド再起動

#### 3. ファイルアップロードエラー

```
❌ Error: File upload failed
```

**解決策**:
- `UPLOAD_DIR`ディレクトリ存在確認
- 書き込み権限確認
- ファイル形式確認（audio/*のみ）

#### 4. Rate Limit エラー

```
❌ Error: Rate limit exceeded
```

**解決策**:
- 1分間に100リクエスト以下に制限
- `Retry-After`ヘッダーに従って待機

### ログ確認

```bash
# バックエンドログ
tail -f backend/app.log

# Docker使用時
docker-compose logs -f backend
```

## 📡 API使用例

### JavaScript/TypeScript

```typescript
import { audioProcessingAPI } from './src/services/api';

// 接続テスト
const connectionTest = await audioProcessingAPI.testConnection();
console.log('API Status:', connectionTest);

// ファイルアップロード
const file = document.getElementById('fileInput').files[0];
const job = await audioProcessingAPI.uploadAndDiarize(file);
console.log('Job ID:', job.jobId);

// 結果取得
const result = await audioProcessingAPI.waitForJobCompletion(job.jobId, {
  onStatusUpdate: (status) => console.log('Status:', status.status)
});

console.log('Diarization Result:', result.output?.diarization);
```

### Python

```python
import requests

# ファイルアップロード
with open('audio.wav', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/diarization/upload',
        files={'file': f}
    )

job = response.json()
print(f"Job ID: {job['jobId']}")

# 結果確認
status_response = requests.get(
    f"http://localhost:8000/api/diarization/jobs/{job['jobId']}"
)

status = status_response.json()
print(f"Status: {status['status']}")
```

## 🚀 本番環境デプロイ

### 環境変数更新

```env
DEBUG=false
WEBHOOK_BASE_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

### セキュリティ設定

1. **WEBHOOK_SECRET**設定
2. **HTTPS**使用
3. **API Key**安全管理
4. **Rate Limiting**設定

## 📚 参考資料

- [pyannote.ai Documentation](https://docs.pyannote.ai/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)

---

## 🎉 完了！

これでpyannote.ai統合Pythonバックエンドが動作します！

問題が発生した場合は、ログを確認し、上記のトラブルシューティングを参照してください。
