import argparse
import os
import json
from google.cloud import storage
from pyannote.audio import Pipeline

def download_from_gcs(gs_uri, local_path):
    """GCSからファイルをダウンロード"""
    bucket_name, blob_path = gs_uri.replace("gs://", "").split("/", 1)
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    blob.download_to_filename(local_path)
    print(f"✅ Downloaded: {gs_uri} -> {local_path}")

def upload_to_gcs(local_path, gs_uri, content_type="application/json"):
    """GCSへファイルをアップロード"""
    bucket_name, blob_path = gs_uri.replace("gs://", "").split("/", 1)
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    blob.upload_from_filename(local_path, content_type=content_type)
    print(f"✅ Uploaded: {local_path} -> {gs_uri}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Input audio GCS path (gs://...)")
    parser.add_argument("--output", required=True, help="Output JSON GCS path (gs://...)")
    args = parser.parse_args()

    # ローカル一時ファイル
    input_wav = "/tmp/input.wav"
    output_json = "/tmp/output.json"

    # 1) GCSからダウンロード
    download_from_gcs(args.input, input_wav)

    # 2) pyannote 3.1 で話者分離
    print("🚀 Loading pyannote 3.1 pipeline...")
    hf_token = os.getenv("MEETING_HF_TOKEN")
    if not hf_token:
        raise ValueError("MEETING_HF_TOKEN environment variable is required")
    
    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        use_auth_token=hf_token
    )
    
    print("🎯 Running diarization...")
    diarization = pipeline(input_wav)

    # 3) 結果をJSON化
    segments = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        segments.append({
            "speaker": speaker,
            "start": round(float(turn.start), 3),
            "end": round(float(turn.end), 3),
            "duration": round(float(turn.end - turn.start), 3)
        })
    
    segments.sort(key=lambda x: x["start"])
    print(f"✅ Diarization completed: {len(segments)} segments")

    # 4) JSONに保存
    with open(output_json, "w") as f:
        json.dump({"segments": segments}, f, indent=2)

    # 5) GCSへアップロード
    upload_to_gcs(output_json, args.output)
    
    print("🎉 Worker completed successfully!")
