# CORE Meeting Realtime

Portal toplantıları Cloudflare RealtimeKit ile gerçek ses, görüntü ve ekran paylaşımı çalıştırabilir.

## Bir defalık Cloudflare kurulumu

1. Cloudflare Dashboard > Realtime > RealtimeKit altında bir App oluştur.
2. App içinde en az bir GROUP_CALL preset oluştur veya varsayılan presetleri kullan. Host ve normal katılımcı için ayrı preset kullanılması önerilir.
3. Realtime izinli bir API token oluştur. Token yalnız Worker secret olarak tutulmalı; repoya yazılmamalı.
4. `core-web` Worker ayarlarına şu runtime değerlerini ekle:
   - `PORTAL_REALTIMEKIT_ACCOUNT_ID`
   - `PORTAL_REALTIMEKIT_APP_ID`
   - `PORTAL_REALTIMEKIT_HOST_PRESET` (opsiyonel; boşsa uygun preset otomatik seçilir)
   - `PORTAL_REALTIMEKIT_PARTICIPANT_PRESET` (opsiyonel; boşsa uygun preset otomatik seçilir)
5. Worker secret olarak `PORTAL_REALTIMEKIT_API_TOKEN` ekle.

Portal tokenı hiçbir zaman tarayıcıya göndermez. Tarayıcı yalnız oturum açmış CORE üyesi için backend tarafından üretilen kısa ömürlü participant auth tokenını alır.

## Çalışma akışı

- Portal toplantısı D1 içinde normal şekilde planlanır.
- İlk gerçek katılımda backend RealtimeKit meeting nesnesini oluşturur ve eşlemeyi `portal_meeting_transports` tablosuna yazar.
- Katılımcı backend üzerinden RealtimeKit participant olarak eklenir veya yeni auth tokenı üretilir.
- Web arayüzü Cloudflare RealtimeKit UI Kit 2.0.2 bileşenini yükler.
- Kamera, mikrofon, ekran paylaşımı, katılımcı grid'i ve WebRTC/SFU bağlantısı RealtimeKit tarafından sağlanır.
