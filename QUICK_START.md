# クイックスタートガイド 🚀

バックエンドAPIは既にGoogle Cloud Runにデプロイ済みです！
ローカルでDockerを起動する必要はありません。

## 📍 現在のデプロイ状況

✅ **バックエンドAPI**: https://audio-processing-api-576239773901.asia-northeast1.run.app  
✅ **フロントエンド**: https://audio-nocode.vercel.app (本番環境)  
✅ **ストレージ**: gs://audio-processing-studio

## 🏃 すぐに始める（ローカル開発）

### 1. 環境変数を設定

```bash
# プロジェクトルートで実行
echo "NEXT_PUBLIC_API_URL=https://audio-processing-api-576239773901.asia-northeast1.run.app" > .env.local
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. 開発サーバーを起動

```bash
npm run dev
```

### 4. ブラウザで開く

http://localhost:3000 にアクセス

## ✨ 動作確認

### APIが正常に動作しているか確認

```bash
curl https://audio-processing-api-576239773901.asia-northeast1.run.app/health
```

以下のレスポンスが返ればOK：
```json
{"status":"ok","project":"encoded-victory-440718-k6","region":"us-west1"}
```

### APIドキュメントを開く

ブラウザで以下を開く：
https://audio-processing-api-576239773901.asia-northeast1.run.app/docs

## 🎤 使い方

1. フロントエンドにアクセス（ローカルまたは本番環境）
2. 音声ファイルをアップロード（WAV, MP3, M4A等）
3. パイプラインを設定
4. 「実行」ボタンをクリック
5. 結果が表示される

## 🔍 トラブルシューティング

### エラー: "Failed to fetch"

- `.env.local` ファイルが作成されているか確認
- 環境変数が正しく設定されているか確認：
  ```bash
  cat .env.local
  ```
- 開発サーバーを再起動

### エラー: "CORS error"

- バックエンドの `ALLOWED_ORIGINS` に、フロントエンドのURLが含まれているか確認
- 現在は `https://audio-nocode.vercel.app` と `http://localhost:3000` が許可されています

## 📚 詳細な情報

- **完全なデプロイガイド**: [CLOUD_DEPLOYMENT.md](./CLOUD_DEPLOYMENT.md)
- **セットアップガイド**: [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **README**: [README.md](./README.md)

## 💡 次のステップ

- [ ] Vercelの環境変数に `NEXT_PUBLIC_API_URL` を設定（本番環境用）
- [ ] Hugging Face トークンを設定（pyannote 3.1を使用する場合）
- [ ] カスタムドメインを設定（オプション）

## 🆘 サポート

問題が発生した場合は、以下を確認してください：

1. Cloud Runのログ:
   ```bash
   gcloud run services logs read audio-processing-api \
     --project encoded-victory-440718-k6 \
     --region asia-northeast1 \
     --limit 50
   ```

2. ブラウザの開発者ツール（F12）のコンソール

3. ネットワークタブでAPIリクエストの詳細を確認
