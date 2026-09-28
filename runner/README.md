# CORE Runner

YTÜ CORE Portal'ın kendi izole kod çalıştırma servisidir.

- Cloudflare Sandbox SDK 0.7.0 + Containers
- Python 3.11
- Node.js / JavaScript
- TypeScript / tsx
- GCC / C
- G++ / C++20
- 15 saniye komut timeout'u
- sabit komut haritası; kullanıcı girdisi shell komutuna interpolate edilmez
- portal ve runner arasında bearer secret kullanılır

## Deploy

1. Cloudflare Workers Paid plan / Containers erişimi gerekir.
2. `cd runner && npm install`
3. `npx wrangler secret put RUNNER_TOKEN`
4. `npm run deploy`
5. Ana portal Worker secret'ına aynı değeri `CORE_RUNNER_TOKEN` olarak ekle.
6. Ana portal `CORE_RUNNER_URL` değerini runner Worker URL'sine ayarla.

Sandbox SDK Docker gerektirir; bu servis ana vinext deploy'undan kasıtlı olarak ayrıdır.
