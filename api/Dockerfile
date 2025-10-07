FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

# Python 3.10 と必要なパッケージをインストール
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    ffmpeg \
    wget \
    && rm -rf /var/lib/apt/lists/*

# python3をpythonとして使用
RUN ln -s /usr/bin/python3 /usr/bin/python

WORKDIR /app

# Silero VADモデルをダウンロード
RUN mkdir -p /app/models && \
    wget -O /app/models/silero_vad.onnx \
    https://github.com/snakers4/silero-vad/raw/master/files/silero_vad.onnx

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -U pip && \
    pip install --no-cache-dir -r requirements.txt

COPY app /app/app

ENV PORT=8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
