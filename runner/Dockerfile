FROM docker.io/cloudflare/sandbox:0.7.0-python

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g typescript tsx
