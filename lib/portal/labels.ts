export function portalRoleLabel(value: string) {
  return ({
    admin: "Yönetici",
    lead: "Program / Takım Lideri",
    member: "Mühendis / Üye",
    alumni: "Mezun",
    viewer: "Görüntüleyici",
  } as Record<string,string>)[value] ?? value;
}

export function portalTaskStatusLabel(value: string) {
  return ({
    backlog: "Havuz",
    todo: "Yapılacak",
    doing: "Yapılıyor",
    review: "İncelemede",
    blocked: "Engelli",
    done: "Tamamlandı",
  } as Record<string,string>)[value] ?? value;
}

export function portalPriorityLabel(value: string) {
  return ({
    low: "Düşük",
    medium: "Orta",
    high: "Yüksek",
    critical: "Kritik",
  } as Record<string,string>)[value] ?? value;
}

export function portalMemberStatusLabel(value: string) {
  return ({
    invited: "Davetli",
    active: "Aktif",
    suspended: "Askıda",
    archived: "Arşiv",
  } as Record<string,string>)[value] ?? value;
}

export function portalVehicleStatusLabel(value: string) {
  return ({
    offline: "Çevrimdışı",
    idle: "Hazır",
    testing: "Testte",
    mission: "Görevde",
    maintenance: "Bakımda",
  } as Record<string,string>)[value] ?? value;
}

export function cmsStatusLabel(value: string) {
  return ({
    draft: "Taslak",
    published: "Yayında",
    archived: "Arşiv",
  } as Record<string,string>)[value] ?? value;
}


export function portalResourceKindLabel(value: string) {
  return ({
    document: "Doküman",
    archive: "Arşiv",
    library: "Kütüphane",
    drawing: "Çizim",
    pcb: "PCB",
    bom: "BOM",
    code: "Kod",
    procedure: "Prosedür",
    dataset: "Veri Seti",
    media: "Medya",
  } as Record<string,string>)[value] ?? value;
}

export function portalNotificationKindLabel(value: string) {
  return ({
    info: "Bilgi",
    warning: "Uyarı",
    action: "İşlem",
    success: "Başarılı",
  } as Record<string,string>)[value] ?? value;
}
