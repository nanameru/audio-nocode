#!/bin/bash
# GPU版Workerイメージをビルド＆プッシュ

PROJECT_ID="encoded-victory-440718-k6"
REGION="us-west1"
IMAGE_NAME="worker-gpu"
IMAGE_TAG="latest"

# イメージURI
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/audio-processing/${IMAGE_NAME}:${IMAGE_TAG}"

echo "🏗️  Building GPU Worker image..."
docker build -f Dockerfile -t "${IMAGE_URI}" .

echo "📤 Pushing to Artifact Registry..."
docker push "${IMAGE_URI}"

echo "✅ GPU Worker image built and pushed: ${IMAGE_URI}"
echo ""
echo "Set this environment variable in Cloud Run:"
echo "WORKER_IMAGE_URI_GPU=${IMAGE_URI}"
