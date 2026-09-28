FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 python3-pytest build-essential cmake ninja-build ca-certificates util-linux \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g typescript@5.6.3 vitest@3.2.4 \
 && useradd --create-home --uid 10001 runner

WORKDIR /opt/core-runner
COPY sandbox_server.py /opt/core-runner/sandbox_server.py
RUN chmod 0555 /opt/core-runner/sandbox_server.py \
 && mkdir -p /tmp/core-runner \
 && chown -R runner:runner /tmp/core-runner /opt/core-runner

USER runner
EXPOSE 8080
CMD ["python3", "/opt/core-runner/sandbox_server.py"]
