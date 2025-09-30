#!/bin/bash
# CPU版Workerイメージをビルド＆プッシュ

PROJECT_ID="encoded-victory-440718-k6"
REGION="us-west1"
IMAGE_NAME="worker-cpu"
IMAGE_TAG="latest"

# イメージURI
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/audio-processing/${IMAGE_NAME}:${IMAGE_TAG}"

echo "🏗️  Building CPU Worker image..."
docker build -f Dockerfile.cpu -t "${IMAGE_URI}" .

echo "📤 Pushing to Artifact Registry..."
docker push "${IMAGE_URI}"

echo "✅ CPU Worker image built and pushed: ${IMAGE_URI}"
echo ""
echo "Set this environment variable in Cloud Run:"
echo "WORKER_IMAGE_URI_CPU=${IMAGE_URI}"
