# クラウドデプロイガイド

このガイドでは、バックエンドAPIをGoogle Cloud Runにデプロイして、ローカルのDockerを使わずにクラウドで実行する方法を説明します。

## 🎯 概要

- **バックエンドAPI**: Google Cloud Run（`api/`ディレクトリ）
- **フロントエンド**: Vercel（自動デプロイ済み）
- **ストレージ**: Google Cloud Storage
- **処理エンジン**: pyannote 3.1（GPU/CPU対応）

## 📋 前提条件

1. **Google Cloud SDKのインストール**
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # または公式サイトからダウンロード
   # https://cloud.google.com/sdk/docs/install
   ```

2. **認証とプロジェクト設定**
   ```bash
   # Google Cloudにログイン
   gcloud auth login
   
   # プロジェクトを設定
   gcloud config set project encoded-victory-440718-k6
   
   # Docker認証
   gcloud auth configure-docker
   ```

3. **必要なAPIの有効化**
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   gcloud services enable storage.googleapis.com
   ```

## 🚀 デプロイ手順

### ステップ1: バックエンドAPIをデプロイ

```bash
# プロジェクトルートで実行
./scripts/deploy-api.sh
```

このスクリプトは以下を実行します：
1. Dockerイメージをビルド
2. Google Container Registryにプッシュ
3. Cloud Runにデプロイ（メモリ4GB、CPU2コア、タイムアウト60分）

デプロイが完了すると、**サービスURL**が表示されます：
```
https://audio-processing-api-XXXXXXXXXX-an.a.run.app
```

### ステップ2: フロントエンドの環境変数を設定

#### ローカル開発の場合

プロジェクトルートに `.env.local` ファイルを作成：

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://audio-processing-api-576239773901.asia-northeast1.run.app
```

#### Vercel本番環境の場合

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクトを選択
3. **Settings** → **Environment Variables** に移動
4. 以下の変数を追加：

   | Name | Value | Environment |
   |------|-------|-------------|
   | `NEXT_PUBLIC_API_URL` | `https://audio-processing-api-576239773901.asia-northeast1.run.app` | Production, Preview, Development |

5. **Save** をクリック
6. プロジェクトを再デプロイ（自動的に最新のコミットでデプロイされます）

### ステップ3: 動作確認

#### APIの確認

```bash
# ヘルスチェック
curl https://audio-processing-api-576239773901.asia-northeast1.run.app/health

# APIドキュメント（ブラウザで開く）
open https://audio-processing-api-576239773901.asia-northeast1.run.app/docs
```

#### フロントエンドの確認

1. https://audio-nocode.vercel.app にアクセス
2. 音声ファイルをアップロード
3. パイプラインを実行
4. 結果が表示されればOK！

## 🔍 トラブルシューティング

### エラー: "Failed to fetch"

**原因**: バックエンドAPIが起動していないか、環境変数が設定されていない

**解決方法**:
1. Cloud Runのログを確認：
   ```bash
   gcloud run services logs read audio-processing-api \
     --project encoded-victory-440718-k6 \
     --region asia-northeast1 \
     --limit 50
   ```

2. 環境変数を確認：
   ```bash
   # ローカル
   cat .env.local
   
   # Vercel
   vercel env ls
   ```

### エラー: "HF_TOKEN not found"

**原因**: Hugging Face トークンのシークレットが設定されていない

**解決方法**:
```bash
# シークレットを作成（トークンを取得: https://huggingface.co/settings/tokens）
echo -n "YOUR_HF_TOKEN_HERE" | gcloud secrets create meeting-hf-token \
  --data-file=- \
  --project=encoded-victory-440718-k6

# Cloud Runサービスにシークレットへのアクセス権を付与
gcloud secrets add-iam-policy-binding meeting-hf-token \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=encoded-victory-440718-k6
```

### エラー: "Permission denied"

**原因**: GCSバケットへのアクセス権限がない

**解決方法**:
```bash
# Cloud Runのサービスアカウントに権限を付与
gsutil iam ch \
  serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com:roles/storage.objectAdmin \
  gs://audio-processing-studio
```

## 📊 コスト管理

### Cloud Run料金

- **CPU使用量**: リクエスト処理中のみ課金
- **メモリ**: 4GB × 実行時間
- **無料枠**: 月に180万リクエスト秒（約5時間の実行時間）

### 料金を抑えるコツ

1. **CPUモードを使う**: GPU不要な処理はCPUで実行
   - UIの「GPU使用」トグルをOFFに
   
2. **タイムアウトを調整**: 長時間処理が不要な場合は短縮
   ```bash
   gcloud run services update audio-processing-api \
     --timeout 600 \
     --region asia-northeast1
   ```

3. **メモリを最適化**: 必要最小限に調整
   ```bash
   gcloud run services update audio-processing-api \
     --memory 2Gi \
     --region asia-northeast1
   ```

## 🔄 更新とロールバック

### コードを更新してデプロイ

```bash
# コードを修正後
./scripts/deploy-api.sh
```

### 前のバージョンにロールバック

```bash
# リビジョン一覧を確認
gcloud run revisions list \
  --service audio-processing-api \
  --region asia-northeast1

# 特定のリビジョンにロールバック
gcloud run services update-traffic audio-processing-api \
  --to-revisions REVISION_NAME=100 \
  --region asia-northeast1
```

## 📝 ログの確認方法

### リアルタイムログ

```bash
gcloud run services logs tail audio-processing-api \
  --project encoded-victory-440718-k6 \
  --region asia-northeast1
```

### Google Cloud Console

1. https://console.cloud.google.com/run にアクセス
2. `audio-processing-api` を選択
3. **ログ** タブをクリック

## 🎉 完了！

これで、ローカルのDockerを起動しなくても、クラウド上でバックエンドAPIが動作します。

- フロントエンド: https://audio-nocode.vercel.app
- バックエンド: https://audio-processing-api-576239773901.asia-northeast1.run.app
- ストレージ: gs://audio-processing-studio

## 🎯 クイックスタート（現在の状態）

バックエンドは既にデプロイ済みです！以下の手順でローカル開発を開始できます：

### 1. 環境変数を設定

プロジェクトルートに `.env.local` ファイルを作成：

```bash
echo "NEXT_PUBLIC_API_URL=https://audio-processing-api-576239773901.asia-northeast1.run.app" > .env.local
```

### 2. フロントエンドを起動

```bash
npm install
npm run dev
```

### 3. ブラウザで開く

http://localhost:3000 にアクセスして、音声ファイルをアップロードして試してください！
