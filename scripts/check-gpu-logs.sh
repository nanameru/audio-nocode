#!/bin/bash
# Cloud Run GPU ログチェッカー

echo "🔍 Checking Cloud Run logs for GPU/CPU usage..."
echo ""

gcloud logging read \
  "resource.type=cloud_run_revision 
   AND resource.labels.service_name=audio-processing-api 
   AND (textPayload=~\"DEBUG\" OR textPayload=~\"Target device\" OR textPayload=~\"Running speaker\")" \
  --limit=50 \
  --format="table(timestamp,textPayload)" \
  --project=encoded-victory-440718-k6

echo ""
echo "💡 Tip: GPU使用時は 'Target device: cuda' が表示されます"
echo "💡 CPU使用時は 'Target device: cpu' が表示されます"

