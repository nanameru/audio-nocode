# Audio Processing Worker

pyannote 3.1を使った話者分離（Diarization）ワーカー

## CPU/GPU対応

このWorkerはCPUとGPU両方に対応しています。

### 自動検出機能

- Worker起動時に`torch.cuda.is_available()`で自動判定
- GPU利用可能 → GPU使用
- GPU利用不可 → CPU使用

### Dockerイメージ

#### GPU版（Dockerfile）
```bash
# GPU版をビルド＆プッシュ
./build-gpu.sh
```

- ベースイメージ: `nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04`
- PyTorch: CUDA 12.1対応版
- 用途: Vertex AI GPU インスタンス（NVIDIA_TESLA_T4）

#### CPU版（Dockerfile.cpu）
```bash
# CPU版をビルド＆プッシュ
./build-cpu.sh
```

- ベースイメージ: `python:3.10-slim`
- PyTorch: CPU専用版（軽量）
- 用途: Vertex AI CPU インスタンス

## デプロイ方法

### 1. Artifact Registryにリポジトリを作成

```bash
gcloud artifacts repositories create audio-processing \
  --repository-format=docker \
  --location=us-west1 \
  --project=encoded-victory-440718-k6
```

### 2. イメージをビルド＆プッシュ

```bash
# GPU版
cd worker
./build-gpu.sh

# CPU版
./build-cpu.sh
```

### 3. Cloud Run APIに環境変数を設定

```bash
gcloud run services update meeting-api \
  --set-env-vars="WORKER_IMAGE_URI_GPU=us-west1-docker.pkg.dev/encoded-victory-440718-k6/audio-processing/worker-gpu:latest" \
  --set-env-vars="WORKER_IMAGE_URI_CPU=us-west1-docker.pkg.dev/encoded-victory-440718-k6/audio-processing/worker-cpu:latest" \
  --region=asia-northeast1
```

## 使用方法

### API経由での実行

```bash
# GPU使用（デフォルト）
curl -X POST https://your-api.run.app/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input_gs_uri": "gs://bucket/input.wav",
    "use_gpu": true
  }'

# CPU使用
curl -X POST https://your-api.run.app/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input_gs_uri": "gs://bucket/input.wav",
    "use_gpu": false
  }'
```

### フロントエンドのトグル

UIの「GPU使用」トグルをオフにすると、CPUモードで実行されます。

- **GPUモード**: 高速だが、GPU料金がかかる
- **CPUモード**: 遅いが、料金が安い

## トラブルシューティング

### 処理が止まる場合

1. **ログを確認**
   ```bash
   # Vertex AIジョブのログを確認
   gcloud ai custom-jobs stream-logs <JOB_ID> \
     --project=encoded-victory-440718-k6 \
     --region=us-west1
   ```

2. **デバイス確認**
   - ログに `🖥️ Using device: cpu` または `🖥️ Using device: cuda:0` が出力される
   - CPUモードなのにGPUを使おうとしていないか確認

3. **イメージの確認**
   - APIログで `📦 Using image: ...` を確認
   - CPU/GPUで適切なイメージが使われているか

### よくある問題

#### GPU版がCPUインスタンスで動かない
→ `WORKER_IMAGE_URI_CPU` を設定してください

#### CPU版が遅すぎる
→ `use_gpu: true` でGPU版を使ってください

#### CUDA out of memory
→ GPU版でもメモリ不足の場合は、マシンタイプを変更するか、CPU版を使用

## ローカル開発

```bash
# ローカルでテスト（CPU版）
docker build -f Dockerfile.cpu -t worker-cpu .
docker run --rm \
  -e MEETING_HF_TOKEN=your_hf_token \
  worker-cpu \
  --input gs://bucket/input.wav \
  --output gs://bucket/output.json
```

## 参考

- [pyannote.audio](https://github.com/pyannote/pyannote-audio)
- [Vertex AI Custom Jobs](https://cloud.google.com/vertex-ai/docs/training/create-custom-job)
