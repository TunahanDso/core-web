# Tema okunabilirliği ve iletişim akışları — 29 Eylül 2026

Koyu temada kalan sabit koyu yazı renkleri semantik tema renklerine taşındı. Metin, ikincil metin, açıklama, form, seçili menü ve durum etiketlerinin zemin/ön plan çiftleri düzeltildi. Vurgu yazısı ile dolu buton rengi ayrıldı. Kod/terminal gibi her zaman koyu yüzeylerin yerel renkleri korundu.

Aurora, üçüncü bir görünüm olarak eklendi: mor/camgöbeği ışıklar, gradyan butonlar, belirgin kart kenarları ve opak çalışma yüzeyleri. Sürekli animasyon veya yeni görsel bağımlılığı yok. Tercih ilk boyamada uygulanır, kontroller arasında eşitlenir ve işletim sistemi değişiminden etkilenmez.

Mail: dar ekranlarda klasör seçici; Türkçe arama; yazışma açma ve yanıt/yeni yazışma kapatma sırasında arama/filtre bağlamı; istemci içi bağlantılar; gönderme/taslak kaydetme sırasında bekleme durumu; açık boş sonuç mesajı.

Sohbet: sonuçsuz aramada alakasız ilk kanalın açılması kaldırıldı; mobil arama liste görünümüne döner; erişilebilir kanallar dışında mesaj sorgusu yapılmaz; baş harf ayrıştırması, mesaj uzunluğu sınırı ve gönderme durumu düzeltildi.

Toplantı: sağlayıcı yalnızca katıl düğmesiyle yüklenir, ayrılınca iframe kaldırılır. Tamamlanan/iptal edilen odada medya açılmaz. Yerel cihaz testinde mikrofon/kamera kontrolleri, hata açıklamaları ve iptal/unmount sonrasında geç verilen izinlerde cihaz temizliği eklendi. Yönetici aksiyonları toplantı durumuna göre gösterilir; rapor butonu yetkilerle uyumludur. Not/rapor/oylama işlemleri geri bildirim gösterir.

## Doğrulama ve sınırlar

- 24 birim/DOM/palet testi: üç temada ana metin ve durum renk çiftleri en az 4.5:1; Aurora gradyan uçları; ilk boyama; senkronizasyon; katıl/ayrıl ve geciken medya izni temizliği.
- TypeScript, kontrat kontrolleri ve üretim derlemesi başarılı.
- Palet testi tüm hesaplanmış sayfa stillerinin veya görsel erişilebilirliğin garantisi değildir. Oturum açılmış gerçek portalda görsel tarama ve gerçek katılımcılarla uçtan uca mail/toplantı testi yapılmadı.
- Toplantı sağlayıcısı bağlı değilse çok katılımcılı ses/görüntü hizmeti kurulmuş sayılmaz; arayüz bunu açıkça belirtir. Yerel cihaz testi kayıt veya yayın yapmaz.
