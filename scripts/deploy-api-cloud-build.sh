#!/bin/bash
# Cloud Build を使用したCloud Run APIデプロイスクリプト（ローカルDocker不要）

set -e

PROJECT_ID="encoded-victory-440718-k6"
REGION="asia-northeast1"
SERVICE_NAME="audio-processing-api"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying ${SERVICE_NAME} to Cloud Run using Cloud Build..."
echo "📍 Project: ${PROJECT_ID}"
echo "🌏 Region: ${REGION}"
echo ""

# Cloud Build APIが有効化されているか確認
echo "🔍 Checking Cloud Build API..."
gcloud services enable cloudbuild.googleapis.com --project=${PROJECT_ID}

# 1. Cloud Buildでイメージをビルド＆プッシュ
echo "📦 Building Docker image using Cloud Build..."
gcloud builds submit ./api \
  --tag ${IMAGE_NAME}:latest \
  --project ${PROJECT_ID} \
  --timeout=20m

echo "✅ Image built and pushed to ${IMAGE_NAME}:latest"
echo ""

# 2. Cloud Runにデプロイ
echo "🌐 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --timeout 3600 \
  --set-env-vars "PROJECT_ID=${PROJECT_ID}" \
  --set-env-vars "REGION=us-west1" \
  --set-env-vars "BUCKET=audio-processing-studio" \
  --set-env-vars "ALLOWED_ORIGINS=https://audio-nocode.vercel.app" \
  --set-secrets "HF_TOKEN=meeting-hf-token:latest"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Service URL:"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(status.url)')

echo "${SERVICE_URL}"
echo ""
echo "📋 Next steps:"
echo "1. Update your .env.local with:"
echo "   NEXT_PUBLIC_API_URL=${SERVICE_URL}"
echo ""
echo "2. For Vercel, add this environment variable:"
echo "   https://vercel.com/YOUR_PROJECT/settings/environment-variables"
echo ""
echo "3. Test the API:"
echo "   curl ${SERVICE_URL}/health"
