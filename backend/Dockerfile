FROM python:3.12-slim

# libgl1/libglib2.0-0: required by opencv-python-headless and PaddleOCR at import time.
# libgomp1: OpenMP runtime paddlepaddle's compiled core links against — without it,
# `import paddle` fails with "ImportError: libgomp.so.1: cannot open shared object file".
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# On x86_64, PaddleX auto-enables its oneDNN ("mkldnn") CPU-acceleration path,
# which hits an unimplemented PIR op conversion for this model at inference
# time ("ConvertPirAttribute2RuntimeAttribute not support ..."). Disabling the
# auto-enable falls back to plain (slower, but correct) CPU inference. Doesn't
# affect arm64 (e.g. local Apple Silicon dev), where oneDNN never applies.
ENV PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT=False

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x docker-entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["./docker-entrypoint.sh"]
