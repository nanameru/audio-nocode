import os
import asyncio
from datetime import timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.cloud import storage, aiplatform, secretmanager
from google.cloud.aiplatform_v1.types import CustomJobSpec, WorkerPoolSpec, MachineSpec, ContainerSpec
from sse_starlette.sse import EventSourceResponse

# 環境変数
PROJECT_ID = os.environ.get("PROJECT_ID", "encoded-victory-440718-k6")
REGION = os.environ.get("REGION", "us-west1")
BUCKET = os.environ.get("BUCKET", "audio-processing-studio")
WORKER_IMAGE_URI = os.environ.get("WORKER_IMAGE_URI")
HF_TOKEN_SECRET = os.environ.get("MEETING_HF_TOKEN", "")

app = FastAPI(title="Meeting Audio Processing API")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Vertex AI 初期化
aiplatform.init(
    project=PROJECT_ID, 
    location=REGION,
    staging_bucket=f"gs://{BUCKET}"
)

# GCS クライアント
storage_client = storage.Client()


class SignUrlRequest(BaseModel):
    file_name: str
    content_type: str = "audio/wav"


class JobRequest(BaseModel):
    input_gs_uri: str
    output_gs_uri: Optional[str] = None
    use_gpu: bool = True


@app.get("/health")
async def health():
    """ヘルスチェック"""
    return {"status": "ok", "project": PROJECT_ID, "region": REGION}


@app.post("/sign-url")
async def create_signed_url(request: SignUrlRequest):
    """GCS署名URLを発行（ブラウザ直アップロード用）"""
    try:
        import json
        from google.oauth2 import service_account
        
        # Secret Managerから秘密鍵を取得
        client = secretmanager.SecretManagerServiceClient()
        secret_name = f"projects/{PROJECT_ID}/secrets/run-api-service-account-key/versions/latest"
        response = client.access_secret_version(request={"name": secret_name})
        secret_data = response.payload.data.decode("UTF-8")
        
        # サービスアカウント認証情報を作成
        service_account_info = json.loads(secret_data)
        credentials = service_account.Credentials.from_service_account_info(service_account_info)
        
        # GCSクライアントを認証情報付きで作成
        storage_client_with_key = storage.Client(credentials=credentials, project=PROJECT_ID)
        bucket = storage_client_with_key.bucket(BUCKET)
        blob = bucket.blob(f"uploads/{request.file_name}")
        
        # PUT用の署名URL（10分有効）
        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=10),
            method="PUT",
            content_type=request.content_type
        )
        
        return {
            "signed_url": url,
            "gs_uri": f"gs://{BUCKET}/uploads/{request.file_name}",
            "expires_in": 600
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/jobs")
async def create_job(request: JobRequest):
    """Vertex AI Custom Job（GPU）を起動"""
    try:
        # デバッグログ：use_gpu の値を確認
        print(f"🔍 DEBUG: use_gpu = {request.use_gpu}")
        
        # 出力先が未指定なら自動生成
        if not request.output_gs_uri:
            file_name = request.input_gs_uri.split("/")[-1].replace(".wav", ".json")
            request.output_gs_uri = f"gs://{BUCKET}/outputs/{file_name}"
        
        # Vertex AI Custom Job の定義（GPU/CPU切り替え）
        if request.use_gpu:
            print("✅ GPU mode selected")
            # GPU使用
            machine_spec = MachineSpec(
                machine_type="n1-standard-4",
                accelerator_type="NVIDIA_TESLA_T4",
                accelerator_count=1,
            )
        else:
            print("🖥️ CPU mode selected")
            # CPU使用（acceleratorなし）
            machine_spec = MachineSpec(
                machine_type="n1-standard-4",
            )
        
        worker_pool_specs = [
            WorkerPoolSpec(
                machine_spec=machine_spec,
                replica_count=1,
                container_spec=ContainerSpec(
                    image_uri=WORKER_IMAGE_URI,
                    args=[
                        "--input", request.input_gs_uri,
                        "--output", request.output_gs_uri,
                    ],
                    env=[
                        {"name": "MEETING_HF_TOKEN", "value": HF_TOKEN_SECRET}
                    ]
                ),
            )
        ]
        
        custom_job = aiplatform.CustomJob(
            display_name="pyannote-diarization",
            worker_pool_specs=worker_pool_specs,
        )
        
        # 非同期実行
        custom_job.submit()
        
        return {
            "job_id": custom_job.resource_name,
            "input": request.input_gs_uri,
            "output": request.output_gs_uri,
            "status": "SUBMITTED"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/events/{job_id:path}")
async def job_events(job_id: str):
    """SSEでジョブ進捗を配信"""
    async def event_generator():
        try:
            last_state = None
            while True:
                # ジョブIDからCustomJobを取得（毎回最新状態を取得）
                job = aiplatform.CustomJob.get(job_id)
                current_state = job.state.name
                
                if current_state != last_state:
                    # 進捗を推定
                    progress = {
                        "JOB_STATE_QUEUED": 5,
                        "JOB_STATE_PENDING": 10,
                        "JOB_STATE_RUNNING": 50,
                        "JOB_STATE_SUCCEEDED": 100,
                        "JOB_STATE_FAILED": 0,
                        "JOB_STATE_CANCELLED": 0,
                    }.get(current_state, 0)
                    
                    yield {
                        "event": "progress",
                        "data": str(progress)
                    }
                    last_state = current_state
                
                # 終了状態なら完了
                if current_state in ["JOB_STATE_SUCCEEDED", "JOB_STATE_FAILED", "JOB_STATE_CANCELLED"]:
                    yield {
                        "event": "complete",
                        "data": current_state
                    }
                    break
                
                await asyncio.sleep(2)
        except Exception as e:
            yield {
                "event": "error",
                "data": str(e)
            }
    
    return EventSourceResponse(event_generator())


@app.get("/jobs/{job_id:path}")
async def get_job_status(job_id: str):
    """ジョブ状態を取得"""
    try:
        # CustomJob.get() で最新状態を取得
        job = aiplatform.CustomJob.get(job_id)
        
        return {
            "job_id": job_id,
            "state": job.state.name,
            "create_time": str(job.create_time),
            "update_time": str(job.update_time),
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
