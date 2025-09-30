FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

# Python と ffmpeg をインストール
RUN apt-get update && apt-get install -y python3-pip ffmpeg && rm -rf /var/lib/apt/lists/*

# PyTorch と pyannote（CUDA 12.1 対応）
RUN pip install -U pip wheel setuptools \
 && pip install torch==2.2.2+cu121 torchaudio==2.2.2+cu121 --index-url https://download.pytorch.org/whl/cu121 \
 && pip install pyannote.audio==3.1.1 pyannote.metrics==3.2.1 ffmpeg-python==0.2.0 google-cloud-storage

WORKDIR /app
COPY worker.py /app/worker.py

ENTRYPOINT ["python3", "/app/worker.py"]
