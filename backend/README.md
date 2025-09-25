# Audio Processing Studio Backend

Pythonバックエンドサーバー with pyannote.ai integration

## 🚀 Features

- **pyannote.ai Integration**: 話者分離（Speaker Diarization）API統合
- **FastAPI**: 高性能な非同期API
- **File Upload**: 音声ファイルアップロード対応
- **Webhook Support**: リアルタイム結果通知
- **Rate Limiting**: pyannote.ai API制限対応
- **Error Handling**: 包括的なエラーハンドリング

## 📋 Requirements

- Python 3.8+
- pyannote.ai API Key
- Redis (optional, for background tasks)

## 🛠️ Installation

### 1. Python環境セットアップ

```bash
# 仮想環境作成
python -m venv venv

# 仮想環境アクティベート
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# 依存関係インストール
pip install -r requirements.txt
```

### 2. 環境変数設定

```bash
# .envファイル作成
cp env.example .env

# .envファイルを編集
nano .env
```

必要な環境変数:

```env
# pyannote.ai API Configuration
PYANNOTE_API_KEY=your_api_key_here
PYANNOTE_BASE_URL=https://api.pyannote.ai/v1

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True

# File Upload Configuration
UPLOAD_DIR=./uploads
TEMP_DIR=./temp
MAX_FILE_SIZE=100MB

# Webhook Configuration
WEBHOOK_BASE_URL=http://localhost:8000
```

### 3. pyannote.ai API Key取得

1. [pyannote.ai Dashboard](https://dashboard.pyannote.ai) にアクセス
2. アカウント作成/ログイン
3. API Keyを生成
4. `.env`ファイルに設定

## 🏃‍♂️ Usage

### サーバー起動

```bash
# 開発モード
python -m app.main

# または uvicorn直接実行
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### API Documentation

サーバー起動後、以下のURLでAPI仕様を確認:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 📡 API Endpoints

### Health Check

```bash
GET /health
```

### Diarization

#### File Upload & Diarization

```bash
POST /api/diarization/upload
Content-Type: multipart/form-data

# Parameters:
# - file: Audio file
# - webhook_url: Optional webhook URL
# - wait_for_completion: Boolean (default: false)
```

#### URL-based Diarization

```bash
POST /api/diarization/url
Content-Type: application/json

{
  "url": "https://example.com/audio.wav",
  "webhook": "https://example.com/webhook"
}
```

#### Job Status Check

```bash
GET /api/diarization/jobs/{job_id}
```

#### List All Jobs

```bash
GET /api/diarization/jobs
```

### Webhooks

#### pyannote.ai Webhook Receiver

```bash
POST /api/webhooks/pyannote
```

## 🔧 Configuration

### pyannote.ai API Settings

Based on [pyannote.ai documentation](https://docs.pyannote.ai/):

- **Rate Limits**: 100 requests/minute
- **File Formats**: MP3, WAV, M4A, FLAC
- **Max File Size**: Depends on your plan
- **Result Retention**: 24 hours

### Webhook Configuration

Webhookを使用する場合:

1. `WEBHOOK_BASE_URL`を公開URLに設定
2. `WEBHOOK_SECRET`でセキュリティ強化（推奨）
3. ngrokなどでローカル開発時の公開URL作成

```bash
# ngrok example
ngrok http 8000
# Use the https URL as WEBHOOK_BASE_URL
```

## 📊 Response Format

### Diarization Result

```json
{
  "jobId": "uuid",
  "status": "succeeded",
  "output": {
    "diarization": [
      {
        "start": 1.2,
        "end": 3.4,
        "speaker": "SPEAKER_01"
      },
      {
        "start": 3.5,
        "end": 6.8,
        "speaker": "SPEAKER_02"
      }
    ]
  }
}
```

### Job Status

- `pending`: ジョブ待機中
- `running`: 処理中
- `succeeded`: 完了
- `failed`: 失敗
- `canceled`: キャンセル

## 🐛 Troubleshooting

### Common Issues

1. **API Key Invalid**
   ```
   GET /api/diarization/test
   ```
   でAPI Key有効性を確認

2. **Rate Limit Exceeded**
   - 429エラー時は`Retry-After`ヘッダーを確認
   - 適切な間隔でリトライ

3. **File Upload Failed**
   - ファイル形式確認（audio/*）
   - ファイルサイズ確認
   - `UPLOAD_DIR`の書き込み権限確認

4. **Webhook Not Received**
   - `WEBHOOK_BASE_URL`が公開URLか確認
   - Firewall設定確認
   - ngrokなどでローカル公開

### Logs

```bash
# ログレベル設定
DEBUG=true  # 詳細ログ
DEBUG=false # 本番用ログ
```

## 🔗 Integration

### Frontend Integration

```typescript
// Example: Upload and diarize
const formData = new FormData();
formData.append('file', audioFile);
formData.append('wait_for_completion', 'false');

const response = await fetch('http://localhost:8000/api/diarization/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Job ID:', result.jobId);
```

### Webhook Integration

```python
# Example webhook handler
@app.route('/webhook', methods=['POST'])
def handle_webhook():
    data = request.json
    job_id = data['jobId']
    status = data['status']
    
    if status == 'succeeded':
        diarization = data['output']['diarization']
        # Process results...
    
    return {'status': 'received'}
```

## 📚 References

- [pyannote.ai Documentation](https://docs.pyannote.ai/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Audio Processing Studio Frontend](../README.md)
