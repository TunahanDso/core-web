FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 python3-pytest build-essential cmake ninja-build ca-certificates util-linux \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g typescript@5.6.3 vitest@3.2.4 \
 && useradd --create-home --uid 10001 runner

WORKDIR /opt/core-runner
RUN npm install --prefix /opt/core-runner ws@8.18.3
COPY sandbox_server.py /opt/core-runner/sandbox_server.py
COPY terminal_server.cjs /opt/core-runner/terminal_server.cjs
COPY start.sh /opt/core-runner/start.sh
RUN chmod 0555 /opt/core-runner/sandbox_server.py /opt/core-runner/terminal_server.cjs \
 && chmod 0555 /opt/core-runner/start.sh \
 && mkdir -p /tmp/core-runner /tmp/core-terminal \
 && chown -R runner:runner /tmp/core-runner /tmp/core-terminal /opt/core-runner

USER runner
EXPOSE 8080 8081
CMD ["/opt/core-runner/start.sh"]
