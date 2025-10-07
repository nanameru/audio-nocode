#!/bin/bash
# Cloud Run APIデプロイスクリプト

set -e

PROJECT_ID="encoded-victory-440718-k6"
REGION="asia-northeast1"
SERVICE_NAME="audio-processing-api"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying ${SERVICE_NAME} to Cloud Run..."

# 1. Dockerイメージをビルド
echo "📦 Building Docker image..."
cd api
docker build --platform linux/amd64 -t ${IMAGE_NAME}:latest .

# 2. Google Container Registryにプッシュ
echo "⬆️  Pushing image to GCR..."
docker push ${IMAGE_NAME}:latest

# 3. Cloud Runにデプロイ
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
  --set-env-vars "PROJECT_ID=${PROJECT_ID},REGION=us-west1,BUCKET=audio-processing-studio,ALLOWED_ORIGINS=https://audio-nocode.vercel.app,http://localhost:3000" \
  --set-secrets "HF_TOKEN=meeting-hf-token:latest"

echo "✅ Deployment complete!"
echo ""
echo "🌐 Service URL:"
gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(status.url)'
