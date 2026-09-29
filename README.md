# YTÜ CORE Platform

YTÜ CORE'un public web sitesi, korumalı yönetim alanı ve üye mühendislik portalının ana uygulama deposu.

## Ürün yüzeyleri

- **Public Web** — TR/EN kurumsal vitrin, projeler, takımlar, araştırma ve yarışmalar.
- **Admin Control Plane** — yalnız Cloudflare Access ile doğrulanmış yöneticilere açık CMS ve portal yönetimi.
- **Member Portal** — davet tabanlı öğrenci üyeliği; görevlar, Vault, Mail, ekip alanları, repo/Code Lab ve operasyon görünürlüğü.
- **CORE Runner** — Code Lab ve canlı terminal için ayrı Cloudflare Container güvenlik sınırı.
- **Mobile** — Capacitor tabanlı iOS/Android istemci yüzeyi ve PWA.
- **Desktop** — Tauri tabanlı, bugün için kısıtlı uzak-portal kabuğu; native mühendislik köprüsü henüz genel yetki sunmaz.

## Güvenlik sınırları

`/admin` bir placeholder değildir. Tüm admin ağacı Cloudflare Access kimliği doğrulanmadan fail-closed davranır.

Member Portal kendi D1-backed oturum modelini kullanır. Araç komut otoritesi public web/CMS/portal ile aynı güvenlik düzleminde değildir. Canlı terminal yalnız CORE Runner'ın ephemeral, network-denied container sınırında çalışır.

Ayrıntılar: [SECURITY.md](SECURITY.md)

## Teknoloji

- Next.js 16 / React 19 / TypeScript
- vinext + Cloudflare Workers
- Cloudflare D1 / R2 / Containers / Workflows
- Capacitor 8
- Tauri 2

## Yerel geliştirme

```bash
npm install
npm run dev
```

Yerel geliştirme adresi: `http://localhost:3000`.

## Doğrulama

```bash
npm run typecheck
npm run build
npm run runner:check
```

CI, portal ve native sınırları için ek mimari kontroller çalıştırır.

## Deployment notları

Production web trafiği HTTPS'e zorlanır. CORE Runner'ın production servis sözleşmesi `runner.ytucore.com` alan adıdır.

Desktop stable release kanalı yalnız imzalı binary kabul eder. Geliştirme/PR artifact'ları production dağıtımı değildir.

## Lisans

Bu depo açık kaynak lisansı ile yayımlanmamaktadır. Kullanım/dağıtım koşulları için [LICENSE](LICENSE) dosyasına bakın.
