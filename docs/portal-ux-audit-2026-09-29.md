# Portal UX, tema ve gezinme incelemesi — 29 Eylül 2026

## İnceleme sınırı

Başlangıç: `main` / `1dc193a` (PR #56). Eklenen 240 maddelik liste bu sürümden önceki bulgular içeriyor; #53–56 ile kapanan güvenlik, servis ayrımı ve performans maddeleri geri alınmadı.

39 üye sayfasının kaynakları ve ortak kabuk, gezinme, stiller, mobil/masaüstü yükleyicileri tarandı. Canlı `/portal` bu çalışma tarayıcısında `/portal/login` adresine yönlendi. Yerel önizlemeye de tarayıcı politikası erişim vermedi. Bu nedenle bu belge **oturum açılmış canlı ekranların görsel onayı, gerçek cihaz testi veya ölçülmüş hız artışı değildir**. Gerçek verili ekranlar ve platform testleri aşağıdaki teslim kapısında kalır.

## Bulgular ve uygulanan düzeltmeler

| Bulgu | Etki | Düzeltme |
|---|---|---|
| Sidebar tercihi `useEffect` içinde, React'ın yönettiği `.portalApp` sınıfını değiştiriyordu. | Yeni belge/yeniden çizimde önce açık menü, sonra kapalı menü; RSC güncellemesiyle sınıfın silinme riski. | İlk çizimden önce küçük harici tercih betiği; tercih belge kökünde, bileşenler ortak dış durum aboneliğinde. |
| Nav `contextual` dizisi her render'da yeniden oluşturuluyordu; etki bağımlılığı seçimi tekrar route grubuna çekiyordu. | Bir modül grubu seçildiğinde eski gruba geri dönme. | Sabit memo bağımlılığı; grup ancak rota değiştiğinde tekrar seçiliyor. Davranış testi eklendi. |
| 139 statik olarak belirlenebilir portal bağlantısı düz `<a>` idi. | Belgenin/kabuğun yeniden yüklenmesi. | `Link prefetch={false}`; dosya indirme/API/dış linkler korunur. GET formları ve sunucu aksiyonları bu dönüşümün kapsamı dışında. |
| Mobil runtime hem kök layout hem runtime loader içinde bulunuyordu. | Masaüstünde gereksiz Capacitor grafiği; mobilde çift yaşam döngüsü. | Üye runtime loader tek sahibi; platforma göre lazy import. |
| Mobil sayaçlar tüm web gezinmelerinde blocking layout sorgusuydu. | Mobil olmayan oturumlarda gereksiz D1 sorgusu. | Yetkili, private/no-store endpoint; yalnızca native başlangıcında istenir. Sayaçların canlı güncellenmesi ayrı çalışma. |
| Desktop Ctrl/Cmd+K hem aramayı odaklıyor hem paleti açıyordu. | Çakışan odak davranışı. | Tek palet, native `<dialog>`, Escape ve tetikleyiciye odak dönüşü. |
| Stil dosyasında yüzlerce 6–11 px yazı kuralı vardı. | Okunamayan metadata, dar butonlar, tutarsız hiyerarşi. | 762 font deklarasyonu ortak gövde/metadata tokenlarına taşındı; 14/12 px rahat, 13/12 px kompakt ölçüler. |
| Yüzey ve metin renkleri sabit açık renklerdi. | Koyu temada beyaz adalar, okunmayan metin. | 1.029 nötr renk kullanımı semantik tokenlara, saydam yüzeyler RGB tokenına taşındı. Mühendislik canvas/status renkleri korunur. |
| Sidebar onarımı yalnızca Desktop sınıfında bazı yüzeylere uygulanmıştı. | Web/native arasında değişen ölçüler. | Web ve Desktop ortak rail, scroll sahibi nav, sabit marka/alt bölüm. |
| Dar menüde dört sekme tek satıra sıkışıyordu. | Etiket taşmaları ve küçük hedefler. | Geniş menüde 2×2, kapalı rail'de dikey grup düğmeleri. |
| Üst çubukta slogan + arama + komut + yoğunluk + kimlik rekabet ediyordu. | 1080–1280 px aralığında yatay baskı. | Tek arama/gezinti kontrolü; kırılımlara göre sadeleşen araçlar. |
| Posta panelleri sadece pencere genişliğini dikkate alıyordu. | Sidebar açıkken çalışma alanına sığmayan sütunlar. | Workspace container query; kalan alana göre iki/tek panel. |
| Portal seviyesinde loading/error sınırı yoktu. | Rota yüklenirken sessizlik, hatada toparlanma eksikliği. | Sakin yükleniyor durumu, yeniden deneme sınırı. |

## Sayfa kapsama haritası

Aşağıdaki grupların tamamı ortak renk, tipografi, odak ve kontrol ölçülerini kullanır. Tablo sınıfını kullanmayan özel yüzeyler ortak token dönüşümünü alır; bu, her özel akışın yeniden tasarlandığı anlamına gelmez.

| Yüzey | Kaynak incelemesi / bu değişiklik |
|---|---|
| Genel bakış | 4 metrik, okunabilir liste/kartlar, gereksiz sistem rozeti kaldırma, client links |
| Projeler, proje detayı, takımlar, takım detayı | Başlık, tablo, form ve aksiyon düzeni; client links |
| Görevler ve görev detayı | Ortak tablo/form metinleri, kontrol hedefleri; client links |
| Kütüphane ve dosya detayı | Liste/metadata/aksiyon yüzeyleri; mühendislik preview yükleme sınırları korunur |
| Dokümanlar, arşiv, mekanik, elektronik | Ortak liste/kart/başlık ölçüleri; dosya indirmelerinin semantiği korunur |
| Depolar, depo detayı, inceleme | Kaynak/diff yüzeylerinin renk tokenları ve metinleri; gerçek Git/snapshot ayrımı korunur |
| Code Lab, iş detayı, terminal | Ortak gezinme ve tipografi; terminal runtime ve yetki sınırları korunur |
| Posta ve yazışma detayı | Alan genişliğine göre panel düzeni, ortak tema; mevcut editör ve aksiyonlar korunur |
| Sohbet | Konuşma/kanal panel kırılımları, ortak tema ve client links |
| Takvim, toplantılar, toplantı detayı | Tablo/form/viewport ölçüleri; medya altyapısına müdahale yok |
| Oylamalar, bütçe | Tablo, durum, filtre ve form okunabilirliği; onay/yetki akışına müdahale yok |
| Envanter | Filtre, tablo, form ve mobil giriş ölçüleri |
| Üyeler, üye detayı, profil, güvenlik | Ortak stiller; profil ve native menüye tema seçimi |
| Bildirimler, etkinlik geçmişi, istatistikler | Okunabilir tablo/kart metinleri ve ortak durum yüzeyleri |
| Proje haritası, araç durumu | Ortak kabuk; canvas renkleri/veri işleme değişmedi |
| Control Center, Ağır Kontrol, arama | Ortak tablo/form düzeni, gezinme; hassas yetki doğrulamaları korunur |

## Tasarım kararı

- Turuncu vurgu korunur. Açık tema beyaz/gri yüzeyler, koyu tema koyu lacivert-gri yüzeyler kullanır; tek başına CSS invert filtresi kullanılmaz.
- Tema seçenekleri: Sistem / Açık / Koyu. Tarayıcıdaki tercih oturumlar arasında saklanır; storage engelliyse o oturumdaki seçim çalışır.
- Yeni kullanıcıda rahat yoğunluk; var olan kompakt tercihi korunur.
- Mobil form yazıları en az 16 px; ortak düğmeler 44 px dokunma hedefi.
- Web dar ekranda tüm modüllere erişen açılır menü; native uygulama mevcut native navigasyonunu korur.
- Public site stil dosyasına portal tema kuralları eklenmez. Başlangıç betiği public rotalarda işlem yapmaz.

## Doğrulama ve kalan kapı

- TypeScript, odaklı güvenlik/şema sözleşmeleri ve üretim build çalıştırılır.
- Davranış testleri: menü grubu seçimi, rota değişiminde grup seçimi, bileşen yeniden bağlanınca kapalı rail'in kalması, localStorage engeli, eşzamanlı tema kontrolleri, sistem temasına tepki, Ctrl/Cmd+K/Escape ve odak dönüşü.
- Tercih başlangıcı VM içinde, etkileşimler jsdom içinde doğrulanır. jsdom gerçek layout/focus-trap motoru değildir.
- `npm run test:ui:preview` gerçek Shell/Nav/Theme bileşenlerini sentetik pano/tablo/posta verileriyle yerel açar; üretim rotası veya auth bypass içermez.
- Birleştirmeden önce: gerçek portal oturumuyla 390/768/1280/1440 genişliklerinde açık/koyu tema, açık/kapalı menü, geri/ileri, sorgu filtreleri ve uzun kayıtlar incelenmeli.
- iOS/Android/Tauri cihazda klavye, safe-area, native sheet ve paket doğrulaması yapılmalı. Bu PR yeni imzalı native paket yayımlamaz.
- Hız yüzdesi iddiası yok; mevcut RUM ile önce/sonra INP, CLS ve TTFB karşılaştırılmalı.
- Legacy workspace CSS hâlâ büyüktür; bu PR temeli ortaklaştırır. Kullanılmayan selectorların kaldırılması ayrı kullanım/coverage doğrulaması gerektirir.
- Önceki 240 maddelik listenin kalan güvenlik/altyapı işleri kapanmış sayılmaz; UI çalışmasının dışında tutulur.
