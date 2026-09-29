# CORE Desktop performance budget

The desktop client must feel like an engineering tool, not a browser tab packaged as an application. These are release gates, not decorative goals.

## Runtime rules

- One primary WebView. Do not keep hidden secondary WebViews alive for navigation.
- No permanent animation loop on ordinary portal screens.
- No blanket filesystem watcher over the user's home directory.
- No unbounded polling. Prefer event streams, push, WebSocket/SSE or explicit refresh.
- CAD/PCB parsing, conversion and repository indexing must never block the UI thread.
- Large viewers are loaded only when visible and must release workers / GPU resources on exit.
- Native features are lazy-loaded by module; unused device/CAD/Git code must stay dormant.
- Background/minimized mode must suspend nonessential refresh work.
- Local cache must be bounded, inspectable and clearable.

## Reference targets

Measurements should be taken on a representative Windows laptop with a 4-core CPU, SSD and 8 GB RAM, and repeated on macOS/Linux before stable release.

| Metric | Target |
| --- | --- |
| Shell launch to first usable portal paint | <= 1.5 s on warm network |
| Re-open from warm process/cache | <= 0.7 s |
| Idle desktop CPU | < 1% average over 30 s |
| Background/minimized CPU | ~0% except active transfer/telemetry |
| Baseline app + WebView memory | target <= 250 MB, investigate > 350 MB |
| Input response | < 100 ms |
| Route interaction response | < 150 ms before network work |
| Scroll / ordinary UI | 55-60 FPS target |
| Main-thread long task | no recurring tasks > 50 ms |
| Default local engineering cache | <= 1 GB, configurable |

OS WebView memory varies by platform; the memory numbers are engineering thresholds for investigation rather than a promise that every OS build has identical accounting.

## Required profiling before 1.0

- cold/warm startup trace
- idle CPU and wake-up frequency
- heap growth after 30 route changes
- PCB/CAD viewer open-close leak test
- 10k-row repository / Vault list virtualization test
- large file upload/download memory test
- serial telemetry at target packet rate
- local terminal sustained output test
- sleep/wake and network-loss recovery
- 8-hour workshop soak test

A feature that violates these budgets must be optimized, isolated into a worker/process, or deferred.
