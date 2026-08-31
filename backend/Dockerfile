FROM python:3.12-slim

# libgl1/libglib2.0-0: required by opencv-python-headless and PaddleOCR at import time.
# libgomp1: OpenMP runtime paddlepaddle's compiled core links against — without it,
# `import paddle` fails with "ImportError: libgomp.so.1: cannot open shared object file".
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x docker-entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["./docker-entrypoint.sh"]
