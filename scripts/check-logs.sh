#!/bin/bash

echo "=== Cloud Run API Logs (最新10件) ==="
gcloud run services logs read meeting-api \
  --region=asia-northeast1 \
  --limit=10 \
  --format="table(timestamp,severity,textPayload)" 2>/dev/null || echo "❌ Cloud Run ログ取得失敗"

echo ""
echo "=== Vertex AI Custom Jobs (最新5件) ==="
gcloud ai custom-jobs list \
  --region=asia-northeast1 \
  --limit=5 \
  --format="table(name.basename(),state,createTime,updateTime)" 2>/dev/null || echo "❌ Vertex AI ジョブ一覧取得失敗"

echo ""
echo "=== GCS バケット内容確認 ==="
gsutil ls gs://audio-processing-studio/uploads/ 2>/dev/null || echo "❌ GCS uploads 確認失敗"
gsutil ls gs://audio-processing-studio/results/ 2>/dev/null || echo "❌ GCS results 確認失敗"

echo ""
echo "✅ ログ確認完了"
echo ""
echo "詳細ログは以下で確認:"
echo "  Cloud Run: https://console.cloud.google.com/run/detail/asia-northeast1/meeting-api/logs?project=encoded-victory-440718-k6"
echo "  Vertex AI: https://console.cloud.google.com/vertex-ai/training/custom-jobs?project=encoded-victory-440718-k6"
echo "  Cloud Logging: https://console.cloud.google.com/logs/query?project=encoded-victory-440718-k6"
