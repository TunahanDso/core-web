"use client";

import { useMemo, useState } from "react";
import {
  deleteControlCenterEntityAction,
  updateControlCenterEntityAction,
} from "@/app/portal/control-center-actions";

type EntityType =
  | "members"
  | "roles"
  | "teams"
  | "projects"
  | "tasks"
  | "vehicles"
  | "repositories"
  | "vault"
  | "inventory";

type Registry = Record<EntityType, Record<string,unknown>[]>;
type LookupOption = { value:string; label:string };

const GROUPS: Array<{ type:EntityType; label:string; code:string }> = [
  { type:"members",label:"Üyeler",code:"MB" },
  { type:"roles",label:"Roller",code:"RL" },
  { type:"teams",label:"Takımlar",code:"TM" },
  { type:"projects",label:"Projeler",code:"PJ" },
  { type:"tasks",label:"Görevler",code:"TK" },
  { type:"vehicles",label:"Araçlar",code:"VH" },
  { type:"repositories",label:"Repo",code:"RP" },
  { type:"vault",label:"Vault",code:"VA" },
  { type:"inventory",label:"Envanter",code:"ST" },
];

function value(row: Record<string,unknown>, key: string) {
  return String(row[key] ?? "");
}
function entityId(type:EntityType,row:Record<string,unknown>) {
  if (type === "roles") return value(row,"role_key");
  if (type === "teams") return value(row,"code");
  if (type === "projects") return value(row,"slug");
  return value(row,"id");
}
function title(type:EntityType,row:Record<string,unknown>) {
  if (type === "members") return value(row,"full_name") || value(row,"email");
  if (type === "roles") return value(row,"label") || value(row,"role_key");
  if (type === "teams") return value(row,"name");
  if (type === "projects") return value(row,"title");
  if (type === "tasks") return value(row,"title");
  if (type === "vehicles") return value(row,"name");
  if (type === "repositories") return value(row,"name");
  if (type === "vault") return value(row,"title");
  return value(row,"name") || value(row,"sku");
}
function subtitle(type:EntityType,row:Record<string,unknown>) {
  if (type === "members") return value(row,"email");
  if (type === "roles") return value(row,"role_key") + " · " + value(row,"scope");
  if (type === "teams") return value(row,"code") + " · " + value(row,"domain");
  if (type === "projects") return value(row,"slug") + " · " + (value(row,"team_code") || "CORE");
  if (type === "tasks") return (value(row,"project_slug") || "CORE") + " · " + (value(row,"assignee_name") || "atanmadı");
  if (type === "vehicles") return value(row,"code") + " · " + (value(row,"team_code") || "CORE");
  if (type === "repositories") return value(row,"slug") + " · " + (value(row,"team_code") || "CORE");
  if (type === "vault") return value(row,"original_name") + " · R" + value(row,"revision");
  return value(row,"sku") + " · " + value(row,"location");
}
function state(type:EntityType,row:Record<string,unknown>) {
  if (type === "members") return value(row,"status");
  if (type === "roles") return value(row,"scope");
  if (type === "teams") return value(row,"status");
  if (type === "projects") return value(row,"status");
  if (type === "tasks") return value(row,"status");
  if (type === "vehicles") return value(row,"lifecycle") || value(row,"status");
  if (type === "repositories") return value(row,"status");
  if (type === "vault") return value(row,"lifecycle_state");
  return Number(row.quantity ?? 0) - Number(row.reserved_quantity ?? 0) <= Number(row.minimum_quantity ?? 0)
    ? "low"
    : "ready";
}
function extraCells(type:EntityType,row:Record<string,unknown>) {
  if (type === "members") return [value(row,"role"),value(row,"last_login_at") || "Henüz giriş yok"];
  if (type === "roles") {
    let count=0;
    try {
      const parsed=JSON.parse(value(row,"capabilities_json") || "[]");
      count=Array.isArray(parsed)?parsed.length:0;
    } catch {}
    return [value(row,"scope"),count + " capability"];
  }
  if (type === "teams") return [value(row,"visibility"),value(row,"domain")];
  if (type === "projects") return [value(row,"team_code") || "CORE",value(row,"readiness") + "% readiness"];
  if (type === "tasks") return [value(row,"priority"),value(row,"due_at") || "Tarih yok"];
  if (type === "vehicles") return [value(row,"platform_type") || value(row,"domain"),value(row,"status")];
  if (type === "repositories") return [value(row,"visibility"),value(row,"default_branch")];
  if (type === "vault") return [value(row,"kind"),value(row,"approval_state")];
  return [value(row,"category"),value(row,"quantity") + " " + value(row,"unit")];
}

function OptionList({
  options,
  value: selected,
}: {
  options:LookupOption[];
  value:string;
}) {
  return (
    <>
      <option value="">— Atanmadı —</option>
      {options.map((option)=><option value={option.value} key={option.value}>{option.label}</option>)}
      {selected && !options.some((option)=>option.value===selected) ? <option value={selected}>{selected}</option> : null}
    </>
  );
}

function EditorFields({
  type,
  row,
  teams,
  projects,
  members,
}: {
  type:EntityType;
  row:Record<string,unknown>;
  teams:LookupOption[];
  projects:LookupOption[];
  members:LookupOption[];
}) {
  if (type === "members") return (
    <>
      <label className="wide"><span>Ad Soyad</span><input name="field.fullName" defaultValue={value(row,"full_name")} required /></label>
      <label><span>Global rol</span><select name="field.role" defaultValue={value(row,"role")}><option value="admin">Admin</option><option value="lead">Program / Takım Lideri</option><option value="member">Mühendis / Üye</option><option value="alumni">Mezun</option><option value="viewer">Görüntüleyici</option></select></label>
      <label><span>Hesap durumu</span><select name="field.status" defaultValue={value(row,"status")}><option value="invited">Davetli</option><option value="active">Aktif</option><option value="suspended">Askıda</option><option value="archived">Arşiv</option></select></label>
    </>
  );
  if (type === "roles") return (
    <>
      <label><span>Rol anahtarı</span><input value={value(row,"role_key")} readOnly disabled /></label>
      <label><span>Scope</span><input value={value(row,"scope")} readOnly disabled /><input type="hidden" name="field.scope" value={value(row,"scope")} /></label>
      <label className="wide"><span>Etiket</span><input name="field.label" defaultValue={value(row,"label")} required /></label>
      <label className="wide"><span>Açıklama</span><textarea name="field.description" rows={4} defaultValue={value(row,"description")} /></label>
      <div className="wide portalMuted">Capability matrisi Üyeler → Role Studio üzerinden yönetilir; burada rol kimliği ve açıklaması düzenlenir.</div>
    </>
  );
  if (type === "teams") return (
    <>
      <label><span>Kod</span><input value={value(row,"code")} readOnly disabled /></label>
      <label><span>Ad</span><input name="field.name" defaultValue={value(row,"name")} required /></label>
      <label><span>Domain</span><input name="field.domain" defaultValue={value(row,"domain")} /></label>
      <label><span>Görünürlük</span><select name="field.visibility" defaultValue={value(row,"visibility")}><option value="restricted">Restricted</option><option value="members">Tüm üyeler</option></select></label>
      <label><span>Durum</span><select name="field.status" defaultValue={value(row,"status")}><option value="active">Aktif</option><option value="archived">Arşiv</option></select></label>
      <label className="wide"><span>Açıklama</span><textarea name="field.description" rows={4} defaultValue={value(row,"description")} /></label>
    </>
  );
  if (type === "projects") return (
    <>
      <label className="wide"><span>Proje adı</span><input name="field.title" defaultValue={value(row,"title")} required /></label>
      <label><span>Takım</span><select name="field.teamCode" defaultValue={value(row,"team_code")}><OptionList options={teams} value={value(row,"team_code")} /></select></label>
      <label><span>Durum</span><select name="field.status" defaultValue={value(row,"status")}><option value="concept">Concept</option><option value="design">Design</option><option value="prototype">Prototype</option><option value="testing">Testing</option><option value="operational">Operational</option><option value="paused">Paused</option><option value="archived">Archived</option></select></label>
      <label><span>Görünürlük</span><select name="field.visibility" defaultValue={value(row,"visibility")}><option value="team">Takım</option><option value="members">Tüm üyeler</option><option value="leads">Liderler</option><option value="admins">Admin</option></select></label>
      <label><span>Risk</span><select name="field.riskLevel" defaultValue={value(row,"risk_level")}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
      <label><span>Readiness %</span><input name="field.readiness" type="number" min="0" max="100" defaultValue={value(row,"readiness")} /></label>
    </>
  );
  if (type === "tasks") return (
    <>
      <label className="wide"><span>Görev</span><input name="field.title" defaultValue={value(row,"title")} required /></label>
      <label><span>Proje</span><select name="field.projectSlug" defaultValue={value(row,"project_slug")}><OptionList options={projects} value={value(row,"project_slug")} /></select></label>
      <label><span>Takım</span><select name="field.teamCode" defaultValue={value(row,"team_code")}><OptionList options={teams} value={value(row,"team_code")} /></select></label>
      <label><span>Atanan</span><select name="field.assigneeId" defaultValue={value(row,"assignee_id")}><OptionList options={members} value={value(row,"assignee_id")} /></select></label>
      <label><span>Durum</span><select name="field.status" defaultValue={value(row,"status")}><option value="backlog">Backlog</option><option value="todo">Todo</option><option value="doing">Doing</option><option value="review">Review</option><option value="blocked">Blocked</option><option value="done">Done</option></select></label>
      <label><span>Öncelik</span><select name="field.priority" defaultValue={value(row,"priority")}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
      <label><span>Son tarih</span><input name="field.dueAt" type="date" defaultValue={value(row,"due_at").slice(0,10)} /></label>
    </>
  );
  if (type === "vehicles") return (
    <>
      <label><span>Kod</span><input value={value(row,"code")} readOnly disabled /></label>
      <label><span>Ad</span><input name="field.name" defaultValue={value(row,"name")} required /></label>
      <label><span>Domain</span><input name="field.domain" defaultValue={value(row,"domain")} /></label>
      <label><span>Takım</span><select name="field.teamCode" defaultValue={value(row,"team_code")}><OptionList options={teams} value={value(row,"team_code")} /></select></label>
      <label><span>Proje</span><select name="field.projectSlug" defaultValue={value(row,"project_slug")}><OptionList options={projects} value={value(row,"project_slug")} /></select></label>
      <label><span>Runtime</span><select name="field.status" defaultValue={value(row,"status")}><option value="offline">Offline</option><option value="idle">Idle</option><option value="testing">Testing</option><option value="mission">Mission</option><option value="maintenance">Maintenance</option></select></label>
      <label><span>Lifecycle</span><select name="field.lifecycle" defaultValue={value(row,"lifecycle") || "prototype"}><option value="concept">Concept</option><option value="prototype">Prototype</option><option value="testing">Testing</option><option value="operational">Operational</option><option value="maintenance">Maintenance</option><option value="retired">Retired</option></select></label>
    </>
  );
  if (type === "repositories") return (
    <>
      <label className="wide"><span>Repository adı</span><input name="field.name" defaultValue={value(row,"name")} required /></label>
      <label><span>Takım</span><select name="field.teamCode" defaultValue={value(row,"team_code")}><OptionList options={teams} value={value(row,"team_code")} /></select></label>
      <label><span>Proje</span><select name="field.projectSlug" defaultValue={value(row,"project_slug")}><OptionList options={projects} value={value(row,"project_slug")} /></select></label>
      <label><span>Görünürlük</span><select name="field.visibility" defaultValue={value(row,"visibility")}><option value="private">Private</option><option value="internal">CORE içi</option><option value="public">Public</option></select></label>
      <label><span>Durum</span><select name="field.status" defaultValue={value(row,"status")}><option value="provisioning">Provisioning</option><option value="ready">Ready</option><option value="degraded">Degraded</option><option value="archived">Archived</option></select></label>
    </>
  );
  if (type === "vault") return (
    <>
      <label className="wide"><span>Başlık</span><input name="field.title" defaultValue={value(row,"title")} required /></label>
      <label><span>Takım</span><select name="field.teamCode" defaultValue={value(row,"team_code")}><OptionList options={teams} value={value(row,"team_code")} /></select></label>
      <label><span>Proje</span><select name="field.projectSlug" defaultValue={value(row,"project_slug")}><OptionList options={projects} value={value(row,"project_slug")} /></select></label>
      <label><span>Görünürlük</span><select name="field.visibility" defaultValue={value(row,"visibility")}><option value="members">Tüm üyeler</option><option value="team">Takım</option><option value="leads">Liderler</option><option value="admins">Admin</option></select></label>
      <label><span>Lifecycle</span><select name="field.lifecycle" defaultValue={value(row,"lifecycle_state")}><option value="active">Active</option><option value="archived">Archived</option><option value="trashed">Trashed</option></select></label>
      <label><span>Approval</span><select name="field.approval" defaultValue={value(row,"approval_state")}><option value="draft">Draft</option><option value="review">Review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
    </>
  );
  return (
    <>
      <label className="wide"><span>Parça / ürün adı</span><input name="field.name" defaultValue={value(row,"name")} required /></label>
      <label><span>Kategori</span><input name="field.category" defaultValue={value(row,"category")} /></label>
      <label><span>Konum</span><input name="field.location" defaultValue={value(row,"location")} /></label>
      <label><span>Miktar</span><input name="field.quantity" type="number" step="0.01" min="0" defaultValue={value(row,"quantity")} /></label>
      <label><span>Minimum</span><input name="field.minimumQuantity" type="number" step="0.01" min="0" defaultValue={value(row,"minimum_quantity")} /></label>
      <label><span>Rezerve</span><input name="field.reservedQuantity" type="number" step="0.01" min="0" defaultValue={value(row,"reserved_quantity")} /></label>
    </>
  );
}

export default function ControlCenterRegistry({
  registry,
  initialType,
  teams,
  projects,
  members,
}: {
  registry:Registry;
  initialType?:EntityType;
  teams:LookupOption[];
  projects:LookupOption[];
  members:LookupOption[];
}) {
  const activeType: EntityType = initialType && GROUPS.some((item)=>item.type===initialType) ? initialType : "projects";
  const [query,setQuery] = useState("");
  const [selected,setSelected] = useState<Record<string,unknown> | null>(null);

  const rows = registry[activeType] || [];
  const filtered = useMemo(() => {
    const needle=query.trim().toLocaleLowerCase("tr-TR");
    if (!needle) return rows;
    return rows.filter((row)=>JSON.stringify(row).toLocaleLowerCase("tr-TR").includes(needle));
  },[rows,query]);

  const group=GROUPS.find((item)=>item.type===activeType)!;
  const selectedId=selected ? entityId(activeType,selected) : "";

  return (
    <section className="controlCenterShell">
      <div className="controlCenterHero">
        <div>
          <span>CORE CONTROL CENTER / REGISTRY</span>
          <h2>Tüm mühendislik nesneleri, tek yönetim yüzeyi.</h2>
          <p>Üye, rol, takım, proje, görev, araç, repository, Vault ve envanter kayıtlarını ara; satırdan incele, düzenle veya güvenli silme/arşivleme akışına gönder.</p>
        </div>
        <div className="controlCenterHeroStats">
          <div><b>{rows.length}</b><small>{group.label.toUpperCase()}</small></div>
          <div><b>100</b><small>SAYFA SINIRI</small></div>
          <div><b>1</b><small>AKTİF REGISTRY</small></div>
          <div><b>0</b><small>GİZLİ FAN-OUT</small></div>
        </div>
      </div>

      <div className="controlCenterToolbar">
        <label className="controlCenterSearch">
          <span>⌕</span>
          <input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={group.label + " içinde ara…"} />
        </label>
        <div className="controlCenterTabs">
          {GROUPS.map((item)=>(
            <a
              className={activeType===item.type?"active":""}
              key={item.type}
              href={"/portal/control-center?type=" + encodeURIComponent(item.type)}
            >
              {item.code} · {item.label}
            </a>
          ))}
        </div>
      </div>

      <div className="controlCenterTableWrap">
        <table className="controlCenterTable">
          <thead>
            <tr>
              <th>{group.label.toUpperCase()}</th>
              <th>BAĞLAM</th>
              <th>DETAY</th>
              <th>DURUM</th>
              <th>AKSİYON</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row)=>{
              const id=entityId(activeType,row);
              const cells=extraCells(activeType,row);
              return (
                <tr key={id}>
                  <td><b>{title(activeType,row)}</b><small>{subtitle(activeType,row)}</small></td>
                  <td>{cells[0] || "—"}</td>
                  <td>{cells[1] || "—"}</td>
                  <td><span className={"controlCenterState " + state(activeType,row)}>{state(activeType,row).toUpperCase()}</span></td>
                  <td>
                    <div className="controlCenterRowActions">
                      <button type="button" onClick={()=>setSelected(row)}>DÜZENLE</button>
                      <button className="danger" type="button" onClick={()=>setSelected(row)}>SİL / ARŞİV</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length ? <div className="controlCenterEmpty">Bu filtreyle eşleşen kayıt yok.</div> : null}
      </div>

      {selected ? (
        <div className="controlCenterInspectorBackdrop" role="presentation" onMouseDown={(event)=>{ if(event.target===event.currentTarget) setSelected(null); }}>
          <aside className="controlCenterInspector" aria-label="Control Center kayıt düzenleyici">
            <div className="controlCenterInspectorHead">
              <div><span>{group.code} / {group.label.toUpperCase()}</span><h3>{title(activeType,selected)}</h3></div>
              <button type="button" aria-label="Kapat" onClick={()=>setSelected(null)}>×</button>
            </div>

            <form className="controlCenterForm" action={updateControlCenterEntityAction}>
              <input type="hidden" name="entityType" value={activeType} />
              <input type="hidden" name="entityId" value={selectedId} />
              <EditorFields type={activeType} row={selected} teams={teams} projects={projects} members={members} />
              <div className="controlCenterFormActions">
                {activeType === "roles" ? <a className="portalOutlineButton" href="/portal/members#role-studio">ROLE STUDIO →</a> : null}
                <button className="portalPrimaryButton" type="submit">DEĞİŞİKLİKLERİ KAYDET</button>
              </div>
            </form>

            <form className="controlCenterDangerBox" action={deleteControlCenterEntityAction}>
              <input type="hidden" name="entityType" value={activeType} />
              <input type="hidden" name="entityId" value={selectedId} />
              <span>{activeType === "roles" ? "SİSTEM ROLÜ" : "DANGER ZONE"}</span>
              <p>
                {activeType === "members" ? "Üye hesabı arşivlenir ve aktif oturumları kapatılır; mühendislik geçmişi korunur." :
                 activeType === "repositories" ? "Repository arşivlenir; R2 commit/object geçmişi fiziksel olarak silinmez." :
                 activeType === "vault" ? "Vault kaydı çöp durumuna alınır; revision ve R2 kaynağı korunur." :
                 activeType === "roles" ? "Sistem rol profilleri silinmez. Rolü Role Studio üzerinden düzenleyebilirsin." :
                 "Bu işlem nesneyi ve ilişkili doğrudan alt kayıtlarını kaldırabilir. Geri alma garantisi yoktur."}
              </p>
              {activeType !== "roles" ? (
                <>
                  <input name="confirmation" placeholder={"Onay için " + selectedId + " yaz"} autoComplete="off" required />
                  <button className="portalDangerButton" type="submit">SİL / ARŞİVLE</button>
                </>
              ) : null}
            </form>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
