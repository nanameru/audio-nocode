# Hugging Face トークン設定完了

## ✅ 設定済み

Hugging Faceのトークンが正常に設定されました。

### 設定内容

- **Secret Manager**: `meeting-hf-token`
- **Cloud Runサービス**: `audio-processing-api`
- **環境変数**: `HF_TOKEN`

### 確認方法

```bash
# Cloud Runのログを確認
gcloud run services logs read audio-processing-api \
  --project encoded-victory-440718-k6 \
  --region asia-northeast1 \
  --limit 20

# 以下のメッセージが表示されればOK：
# ✅ Device set to cpu
# 📋 Available models: ['3.1']
```

### トークンの更新方法

トークンを更新する場合：

```bash
# 新しいトークンのバージョンを作成
echo -n "NEW_TOKEN_HERE" | gcloud secrets versions add meeting-hf-token \
  --data-file=- \
  --project=encoded-victory-440718-k6

# Cloud Runサービスを再起動（最新バージョンを使用）
gcloud run services update audio-processing-api \
  --region asia-northeast1 \
  --project encoded-victory-440718-k6
```

## 🎯 使用できる機能

- ✅ pyannote 3.1 話者分離
- ✅ GPU/CPU自動切り替え
- ✅ Handy音声前処理

## 📚 参考

- [pyannote.audio](https://github.com/pyannote/pyannote-audio)
- [Hugging Face Token Management](https://huggingface.co/settings/tokens)
