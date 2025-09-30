# CPU/GPU切り替え検証ガイド

## 問題の原因

トグルをオフにしてもCPUで処理されない問題は、**Worker側でCPU/GPUを自動検出する実装が欠けていた**ことが原因でした。

## 修正内容

### 1. Worker側の修正（`worker/worker.py`）

```python
# CPU/GPU自動検出
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"🖥️  Using device: {device}")

pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization-3.1",
    use_auth_token=hf_token
)

# デバイスを明示的に指定
pipeline.to(device)
print(f"✅ Pipeline loaded on {device}")
```

### 2. Dockerイメージの分離

#### GPU版（`worker/Dockerfile`）
- ベースイメージ: `nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04`
- PyTorch: CUDA 12.1対応版

#### CPU版（`worker/Dockerfile.cpu`）
- ベースイメージ: `python:3.10-slim`
- PyTorch: CPU専用版（軽量）

### 3. API側の修正（`api/app/main.py`）

```python
# CPU/GPUに応じて異なるDockerイメージを使用
if request.use_gpu:
    image_uri = WORKER_IMAGE_URI_GPU or WORKER_IMAGE_URI
else:
    image_uri = WORKER_IMAGE_URI_CPU or WORKER_IMAGE_URI
```

## デプロイ手順

### ステップ1: Dockerイメージをビルド＆プッシュ

```bash
cd worker

# GPU版をビルド
./build-gpu.sh

# CPU版をビルド
./build-cpu.sh
```

### ステップ2: Cloud Run APIに環境変数を設定

```bash
gcloud run services update meeting-api \
  --set-env-vars="WORKER_IMAGE_URI_GPU=us-west1-docker.pkg.dev/encoded-victory-440718-k6/audio-processing/worker-gpu:latest" \
  --set-env-vars="WORKER_IMAGE_URI_CPU=us-west1-docker.pkg.dev/encoded-victory-440718-k6/audio-processing/worker-cpu:latest" \
  --region=asia-northeast1
```

### ステップ3: APIをデプロイ

```bash
cd api
gcloud run deploy meeting-api \
  --source . \
  --region=asia-northeast1
```

## 検証方法

### 方法1: ログでデバイスを確認

#### API側のログ

```bash
# Cloud Runのログを確認
gcloud run services logs read meeting-api \
  --region=asia-northeast1 \
  --limit=50
```

期待される出力：
```
✅ GPU mode selected
📦 Using image: us-west1-docker.pkg.dev/.../worker-gpu:latest
```

または

```
🖥️ CPU mode selected
📦 Using image: us-west1-docker.pkg.dev/.../worker-cpu:latest
```

#### Worker側のログ

```bash
# Vertex AIジョブのログを確認
gcloud ai custom-jobs stream-logs <JOB_ID> \
  --project=encoded-victory-440718-k6 \
  --region=us-west1
```

期待される出力：
```
🖥️ Using device: cpu
✅ Pipeline loaded on cpu
```

または

```
🖥️ Using device: cuda:0
✅ Pipeline loaded on cuda:0
```

### 方法2: フロントエンドのUIで確認

1. **ブラウザでアプリを開く**
2. **Pyannote 3.1 Diarizationモジュールを選択**
3. **プロパティパネルで「GPU使用」トグルを確認**
   - ✅ Enabled（緑）: GPUモード
   - ❌ Disabled（グレー）: CPUモード
4. **音声ファイルをアップロードして実行**
5. **実行モニターを開く**
6. **ブラウザのコンソールログを確認**
   ```javascript
   // 期待される出力
   Starting pyannote 3.1 diarization with options: { useGpu: false }
   ```

### 方法3: APIを直接呼び出して確認

#### GPUモードで実行

```bash
curl -X POST https://meeting-api-576239773901.asia-northeast1.run.app/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input_gs_uri": "gs://audio-processing-studio/uploads/test.wav",
    "use_gpu": true
  }'
```

#### CPUモードで実行

```bash
curl -X POST https://meeting-api-576239773901.asia-northeast1.run.app/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input_gs_uri": "gs://audio-processing-studio/uploads/test.wav",
    "use_gpu": false
  }'
```

レスポンス例：
```json
{
  "job_id": "projects/.../locations/us-west1/customJobs/...",
  "input": "gs://audio-processing-studio/uploads/test.wav",
  "output": "gs://audio-processing-studio/outputs/test.json",
  "status": "SUBMITTED"
}
```

## トラブルシューティング

### ❌ 処理が止まる

**考えられる原因:**
1. GPU環境でCPU用イメージを使っている（逆も同様）
2. イメージがビルド・プッシュされていない
3. 環境変数が設定されていない

**解決策:**
```bash
# 1. イメージを確認
gcloud artifacts docker images list \
  us-west1-docker.pkg.dev/encoded-victory-440718-k6/audio-processing

# 2. 環境変数を確認
gcloud run services describe meeting-api \
  --region=asia-northeast1 \
  --format="value(spec.template.spec.containers[0].env)"

# 3. ログで実際に使われているイメージを確認
gcloud run services logs read meeting-api --region=asia-northeast1
```

### ❌ CUDA out of memory

**原因:** GPU版でメモリ不足

**解決策:**
1. CPU版を使用（トグルをオフ）
2. または、GPU用マシンタイプを変更
   ```python
   # api/app/main.py
   machine_spec = MachineSpec(
       machine_type="n1-standard-8",  # メモリ増量
       accelerator_type="NVIDIA_TESLA_T4",
       accelerator_count=1,
   )
   ```

### ❌ "WORKER_IMAGE_URI not configured" エラー

**原因:** 環境変数が設定されていない

**解決策:**
```bash
# 最低限、汎用イメージを設定
gcloud run services update meeting-api \
  --set-env-vars="WORKER_IMAGE_URI=us-west1-docker.pkg.dev/encoded-victory-440718-k6/audio-processing/worker-gpu:latest" \
  --region=asia-northeast1
```

## 期待される動作

| トグル状態 | API | Vertex AI | Worker | デバイス |
|-----------|-----|-----------|--------|---------|
| ✅ Enabled | `use_gpu: true` | GPU付きマシン | GPU版イメージ | `cuda:0` |
| ❌ Disabled | `use_gpu: false` | CPUマシン | CPU版イメージ | `cpu` |

## パフォーマンス比較

| モード | 処理時間（10分音声） | コスト（概算） |
|--------|---------------------|--------------|
| GPU | 〜2分 | $0.50 |
| CPU | 〜10分 | $0.10 |

※ 実際の時間とコストは音声の長さや品質により変動します

## 次のステップ

1. ✅ Worker側でCPU/GPU自動検出を実装（完了）
2. ✅ CPU/GPU用の別々のDockerイメージを作成（完了）
3. ✅ API側でイメージを切り替える実装（完了）
4. ⏳ デプロイして検証
5. ⏳ ログで動作確認

## 参考

- `worker/README.md`: Worker詳細ドキュメント
- `worker/build-gpu.sh`: GPU版ビルドスクリプト
- `worker/build-cpu.sh`: CPU版ビルドスクリプト
