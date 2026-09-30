import Link from "next/link";

export type HomeItem={id:string;title:string;meta:string;href?:string;badge?:string;tone?:"accent"|"warning"};
export type HomeData={name:string;stats:{label:string;value:number;detail:string;href:string}[];tasks:HomeItem[];agenda:HomeItem[];notifications:HomeItem[];stock:HomeItem[];activity:HomeItem[];openPolls:number;pendingBudget:number;vehicles:number};

function HomeList({items,empty}:{items:HomeItem[];empty:string}){
  if(!items.length)return <p className="coreHomeEmpty">{empty}</p>;
  return <ul className="coreHomeList">{items.map(item=><li key={item.id}>
    <div className="coreHomeItemCopy">{item.href?<Link href={item.href} prefetch={false}>{item.title}</Link>:<b>{item.title}</b>}<small>{item.meta}</small></div>
    {item.badge?<span className={"coreHomeBadge "+(item.tone||"")}>{item.badge}</span>:null}
  </li>)}</ul>;
}

function HomePanel({title,href,children}:{title:string;href:string;children:React.ReactNode}){
  return <section className="coreHomePanel"><header><h2>{title}</h2><Link href={href} prefetch={false} aria-label={title+": tümünü gör"}>Tümü <span aria-hidden="true">↗</span></Link></header>{children}</section>;
}

export default function PortalHome({data}:{data:HomeData}){
  return <div className="coreHome">
    <header className="coreHomeWelcome"><div><p className="coreHomeEyebrow">ÇALIŞMA ALANIN</p><h1>Merhaba, {data.name}.</h1><p>İşlerin, ekibin ve bugünün planı burada.</p></div><Link href="/portal/tasks?create=1" prefetch={false} className="portalPrimaryButton">+ Görev oluştur</Link></header>
    <section className="coreHomeStats" aria-label="Güncel durum">{data.stats.map(stat=><Link href={stat.href} prefetch={false} key={stat.label}><span>{stat.label}</span><b>{stat.value}</b><small>{stat.detail}</small><i aria-hidden="true">↗</i></Link>)}</section>
    <nav className="coreHomeShortcuts" aria-label="Hızlı erişim">{[
      ["Projeler","Çalışma alanlarını aç","/portal/projects","PJ"],
      ["İç yazışma","Oku, yaz ve paylaş","/portal/mail","ML"],
      ["Kütüphane","Dosyalar ve tasarımlar","/portal/library","VA"],
      ["Sohbet","Ekibinle iletişim kur","/portal/chat","CH"],
    ].map(([title,detail,href,code])=><Link href={href} prefetch={false} key={href}><span className="coreHomeShortcutIcon" aria-hidden="true">{code}</span><div><b>{title}</b><small>{detail}</small></div></Link>)}</nav>
    <div className="coreHomeColumns">
      <HomePanel title="Bana atanan işler" href="/portal/tasks"><HomeList items={data.tasks} empty="Şu an açık atanmış görevin yok."/></HomePanel>
      <HomePanel title="Sıradaki buluşmalar" href="/portal/calendar"><HomeList items={data.agenda} empty="Yaklaşan toplantı veya takvim kaydı yok."/></HomePanel>
      <HomePanel title="Bildirimler" href="/portal/notifications"><HomeList items={data.notifications} empty="Hepsini gördün. Okunmamış bildirimin yok."/></HomePanel>
      <HomePanel title="Operasyon özeti" href="/portal/ops"><div className="coreHomeOperations"><Link href="/portal/ops" prefetch={false}><b>{data.vehicles}</b><span>Hazır araç</span></Link><Link href="/portal/polls" prefetch={false}><b>{data.openPolls}</b><span>Açık oylama</span></Link><Link href="/portal/budget" prefetch={false}><b>{data.pendingBudget}</b><span>Bütçe onayı</span></Link></div><HomeList items={data.stock} empty="Minimum seviyenin altında stok yok."/></HomePanel>
    </div>
    <HomePanel title="Son etkinlik" href="/portal/activity"><HomeList items={data.activity} empty="Henüz etkinlik kaydı yok."/></HomePanel>
  </div>;
}
