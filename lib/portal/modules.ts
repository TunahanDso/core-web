export const portalNavigation = [
  {
    label: "ÇALIŞMA ALANI",
    items: [
      ["Genel Bakış", "/portal", "OV"],
      ["Projeler", "/portal/projects", "PJ"],
      ["Görevler", "/portal/tasks", "PM"],
      ["Takvim", "/portal/calendar", "CL"],
      ["Bildirimler", "/portal/notifications", "NT"],
    ],
  },
  {
    label: "BİLGİ & ARŞİV",
    items: [
      ["Kütüphane", "/portal/library", "LB"],
      ["Dokümanlar", "/portal/documents", "DC"],
      ["Arşiv", "/portal/archive", "AR"],
      ["Depolar / Repo", "/portal/repositories", "RP"],
      ["Mekanik / CAD", "/portal/mechanical", "CAD"],
      ["PCB / Elektronik", "/portal/electronics", "PCB"],
      ["Code Lab", "/portal/code-lab", "CL"],
    ],
  },
  {
    label: "İLETİŞİM",
    items: [
      ["Sohbet", "/portal/chat", "CH"],
      ["İç Yazışma", "/portal/mail", "ML"],
      ["Üyeler", "/portal/members", "MB"],
      ["Güvenlik & Cihazlar", "/portal/security", "SEC"],
    ],
  },
  {
    label: "OPERASYON",
    items: [
      ["Stok & Envanter", "/portal/inventory", "ST"],
      ["Canlı Araç", "/portal/ops", "OP"],
      ["Etkinlik Geçmişi", "/portal/activity", "AC"],
      ["İstatistikler", "/portal/analytics", "AN"],
    ],
  },
] as const;

export const portalModuleCards = [
  ["Projeler", "Her proje için görev, doküman, repo ve ilerleme çalışma alanı.", "/portal/projects", "PJ"],
  ["Görevler", "Atama, öncelik, yorum ve inceleme akışıyla gerçek iş kuyruğu.", "/portal/tasks", "PM"],
  ["Bilgi Merkezi", "Dokümanlar, raporlar, çizimler ve kurumsal teknik hafıza.", "/portal/library", "LB"],
  ["Depolar / Repo", "CORE native Git servis sınırı, sahiplik ve opsiyonel mirror kayıtları.", "/portal/repositories", "RP"],
  ["Mekanik / CAD", "CAD kaynakları, revision geçmişi, 3B önizleme ve conversion kuyruğu.", "/portal/mechanical", "CAD"],
  ["Code Lab", "İzole Runner üzerinde build, test ve statik analiz işleri.", "/portal/code-lab", "CL"],
  ["Elektronik", "PCB, BOM, çizimler ve donanım dokümantasyonu.", "/portal/electronics", "PCB"],
  ["Stok & Envanter", "Parçalar, araçlar, konumlar, rezervler ve minimum stok.", "/portal/inventory", "ST"],
  ["Sohbet", "Teknik ve saha koordinasyonu için iç iletişim kanalları.", "/portal/chat", "CH"],
  ["İç Yazışma", "Kalıcı karar ve devir teslim yazışmaları.", "/portal/mail", "ML"],
  ["Canlı Araç", "Salt okunur araç durumu ve onaylı telemetri.", "/portal/ops", "OP"],
  ["Takvim", "Testler, toplantılar, son tarihler ve saha operasyonları.", "/portal/calendar", "CL"],
  ["İstatistikler", "Takım, içerik ve operasyon sağlığına tek bakış.", "/portal/analytics", "AN"],
] as const;
