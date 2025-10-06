import os
import asyncio
import json
import tempfile
import subprocess
from datetime import timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.cloud import storage, secretmanager

# 環境変数
PROJECT_ID = os.environ.get("PROJECT_ID", "encoded-victory-440718-k6")
REGION = os.environ.get("REGION", "us-west1")
BUCKET = os.environ.get("BUCKET", "audio-processing-studio")
HF_TOKEN_SECRET = os.environ.get("HF_TOKEN", "")

app = FastAPI(title="Meeting Audio Processing API")

# CORS設定（開発環境用：複数オリジン対応）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GCS クライアント
storage_client = storage.Client()


class SignUrlRequest(BaseModel):
    file_name: str
    content_type: str = "audio/wav"


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


class DownloadUrlRequest(BaseModel):
    gs_uri: str


@app.post("/download-url")
async def create_download_url(request: DownloadUrlRequest):
    """GCS署名ダウンロードURLを発行"""
    try:
        import json
        from google.oauth2 import service_account
        
        # gs:// プレフィックスを削除してパスを取得
        if not request.gs_uri.startswith(f"gs://{BUCKET}/"):
            raise HTTPException(status_code=400, detail="Invalid GCS URI")
        
        blob_path = request.gs_uri.replace(f"gs://{BUCKET}/", "")
        
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
        blob = bucket.blob(blob_path)
        
        # GET用の署名URL（10分有効）
        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=10),
            method="GET"
        )
        
        return {
            "signed_url": url,
            "expires_in": 600
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== Cloud Run 常駐版: pyannote.audio を内蔵 =====

# グローバル変数でpyannoteパイプラインを保持
pipeline = None

@app.on_event("startup")
async def startup_event():
    """起動時にpyannoteパイプラインを初期化（1回だけ）"""
    global pipeline
    print("🚀 Initializing pyannote.audio pipeline...")
    
    try:
        from pyannote.audio import Pipeline
        import torch
        
        # Hugging Face トークンを取得
        token = HF_TOKEN_SECRET
        if not token:
            print("⚠️  HF_TOKEN not found, pipeline initialization skipped")
            return
        
        # パイプラインをロード
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=token
        )
        
        # GPU/CPU自動選択
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        pipeline.to(device)
        
        print(f"✅ Pipeline loaded on {device}")
        
    except Exception as e:
        print(f"❌ Failed to initialize pipeline: {e}")
        pipeline = None


class ProcessLocalRequest(BaseModel):
    input_gs_uri: str
    output_gs_uri: Optional[str] = None
    use_gpu: bool = True  # デフォルトはGPU


@app.post("/process-local")
async def process_local(request: ProcessLocalRequest):
    """Cloud Run内で直接処理（Vertex AI不要、Job待ちゼロ）"""
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Pipeline not initialized")
    
    # デバッグログ：use_gpu の値を確認
    print(f"🔍 DEBUG: process-local use_gpu = {request.use_gpu}")
    
    audio_path = None
    original_audio_path = None
    
    try:
        # 元のファイル名と拡張子を取得
        original_filename = request.input_gs_uri.split("/")[-1]
        file_extension = os.path.splitext(original_filename)[1] or ".wav"
        base_name = os.path.splitext(original_filename)[0]
        
        # 出力先が未指定なら自動生成
        if not request.output_gs_uri:
            request.output_gs_uri = f"gs://{BUCKET}/outputs/{base_name}.json"
        
        print(f"🎯 Processing {request.input_gs_uri} locally...")
        print(f"📁 File format: {file_extension}")
        
        # 1. GCSからファイルをダウンロード
        bucket = storage_client.bucket(BUCKET)
        blob_path = request.input_gs_uri.replace(f"gs://{BUCKET}/", "")
        blob = bucket.blob(blob_path)
        
        # 2. 一時ファイルに保存（元の拡張子を使用）
        with tempfile.NamedTemporaryFile(suffix=file_extension, delete=False) as tmp_file:
            blob.download_to_filename(tmp_file.name)
            original_audio_path = tmp_file.name
        
        print(f"📥 Downloaded to {original_audio_path}")
        
        # 3. 必要に応じてwavに変換
        if file_extension.lower() not in ['.wav', '.wave']:
            print(f"🔄 Converting {file_extension} to WAV...")
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav_file:
                wav_path = wav_file.name
            
            # ffmpegで変換
            result_ffmpeg = subprocess.run(
                ['ffmpeg', '-i', original_audio_path, '-ar', '16000', '-ac', '1', wav_path, '-y'],
                capture_output=True,
                text=True
            )
            
            if result_ffmpeg.returncode != 0:
                print(f"❌ FFmpeg error: {result_ffmpeg.stderr}")
                raise Exception(f"Failed to convert audio: {result_ffmpeg.stderr}")
            
            audio_path = wav_path
            print(f"✅ Converted to {wav_path}")
        else:
            audio_path = original_audio_path
        
        # 4. GPU/CPU切り替え
        import torch
        target_device = torch.device("cuda" if request.use_gpu and torch.cuda.is_available() else "cpu")
        
        # 現在のデバイスを安全に取得
        try:
            current_device = next(iter(pipeline.parameters())).device
        except (StopIteration, TypeError, AttributeError):
            current_device = None
        
        print(f"🎯 Target device: {target_device}")
        print(f"📍 Current device: {current_device}")
        
        # デバイスが異なる場合は移動（初回はNoneなので必ず移動）
        if current_device is None or current_device != target_device:
            print(f"🔄 Moving pipeline to {target_device}...")
            pipeline.to(target_device)
        
        # 5. pyannote.audio で処理
        print(f"🎙️  Running speaker diarization on {target_device}...")
        diarization = pipeline(audio_path)
        
        # デバッグ: diarizationの型を確認
        print(f"🔍 DEBUG: diarization type = {type(diarization)}")
        print(f"🔍 DEBUG: diarization has itertracks = {hasattr(diarization, 'itertracks')}")
        print(f"🔍 DEBUG: diarization dir = {dir(diarization)}")
        
        # 6. 結果を整形
        result = []
        try:
            # 標準的な方法
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                result.append({
                    "start": turn.start,
                    "end": turn.end,
                    "speaker": speaker
                })
        except (TypeError, AttributeError) as e:
            print(f"⚠️  Standard iteration failed: {e}")
            print(f"🔍 Attempting alternative iteration...")
            
            # diarizationがdictの場合の処理
            if isinstance(diarization, dict):
                print(f"🔍 diarization is dict with keys: {diarization.keys()}")
                # dictの場合、直接イテレート
                if 'segments' in diarization:
                    for seg in diarization['segments']:
                        result.append(seg)
                else:
                    raise Exception(f"Unknown dict structure: {diarization}")
            else:
                # その他の場合
                raise Exception(f"Cannot iterate over type {type(diarization)}: {e}")
        
        speaker_count = len(set(item["speaker"] for item in result))
        print(f"✅ Found {speaker_count} speakers, {len(result)} segments")
        
        # 7. GCSに結果をアップロード
        output_blob_path = request.output_gs_uri.replace(f"gs://{BUCKET}/", "")
        output_blob = bucket.blob(output_blob_path)
        output_blob.upload_from_string(
            json.dumps(result, indent=2),
            content_type="application/json"
        )
        
        # 8. 一時ファイル削除
        os.unlink(audio_path)
        if audio_path != original_audio_path:
            os.unlink(original_audio_path)
        
        print(f"📤 Results uploaded to {request.output_gs_uri}")
        
        return {
            "status": "success",
            "output_gs_uri": request.output_gs_uri,
            "speaker_count": speaker_count,
            "segment_count": len(result)
        }
        
    except Exception as e:
        print(f"❌ Error during processing: {e}")
        # エラー時も一時ファイルを削除
        try:
            if audio_path:
                os.unlink(audio_path)
            if original_audio_path and audio_path != original_audio_path:
                os.unlink(original_audio_path)
        except:
            pass
        raise HTTPException(status_code=500, detail=str(e))
