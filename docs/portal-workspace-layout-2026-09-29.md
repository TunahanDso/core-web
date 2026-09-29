# Düz menü ve boyutlandırılabilir çalışma alanları

Sol menüdeki hızlı erişim/grup sekmeleri kaldırıldı. Yetkili olunan tüm bağlantılar tek kaydırılabilir listede, birer kez görünür. Seçili rota, dar menü ve mobil menü davranışları korunur; kontrol bağlantıları rol filtresinden geçer.

Depo kodu/yan panel, review dosya listesi/diff ve Vault önizleme/dosya bilgileri arasında sürüklenebilir ayırıcı bulunur. CAD, PCB, kod/kaynak ve terminal görünür alanları üst-alt ve sağ tutamaçlarla boyutlandırılır. CAD kanvası ResizeObserver ile gerçek boyuta yeniden çizilir. Mevcut terminal FitAddon gözlemcisi görünür terminal alanını yeniden hesaplar; Runner PTY boyut protokolü bu kapsamda değiştirilmedi.

Düzen cihazda çalışma alanı türüne göre hatırlanır. Sıfırla düğmesi veya tutamaçta çift tık/Enter varsayılana döner. Ok tuşları, Shift ile büyük adımlar, Home/End sınırları desteklenir. Hatalı kayıtlar sınırlandırılır; depolama engeli işlevi bozmaz. Pointer iptali eski ölçüye döner. Dar ekranlarda kolonlar alt alta geçer ve yatay tutamaçlar gizlenir. Boyutlandırma çocuk bileşenleri yeniden mount etmez; açık düzenleme ve bağlantılar korunur.

Doğrulama: 27 birim/DOM/palet testi; TypeScript, kontrat kontrolleri ve üretim derlemesi. Testler düz menü yetkileri, gerçek sürükleme olayları, sınırlar, sıfırlama, iptal, klavye, kayıt ve düzenlenmiş textarea kimliğinin korunmasını kapsar. Oturum açılmış portalda görsel/touch cihaz testi ve gerçek Runner oturumuyla uçtan uca test yapılmadı. Geliştirme fixture'ında mühendislik rotaları boyutlandırma örneğini gösterir.
