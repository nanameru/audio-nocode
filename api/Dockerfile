FROM python:3.10-slim

# ffmpeg をインストール（pyannote.audio に必要）
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -U pip && \
    pip install --no-cache-dir -r requirements.txt

COPY app /app/app

ENV PORT=8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
