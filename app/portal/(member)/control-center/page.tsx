import { notFound } from "next/navigation";
import ControlCenterRegistry from "@/components/portal/ControlCenterRegistry";
import { PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { listControlCenterRegistry } from "@/lib/portal/control-center";
import { portalMemberCapabilitySet } from "@/lib/portal/governance";

export const dynamic = "force-dynamic";

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

export default async function PortalControlCenterPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string; saved?: string; deleted?: string }>;
}) {
  const member = await requirePortalMember();
  const query = searchParams ? await searchParams : {};

  const capabilityNames = [
    "portal.admin",
    "roles.manage",
    "teams.manage",
    "control.projects",
    "control.vehicles",
  ] as const;
  const capabilitySet = await portalMemberCapabilitySet(member);
  if (!capabilityNames.some((capability) => capabilitySet.has(capability))) notFound();

  const allowed: EntityType[] = [
    "members","roles","teams","projects","tasks","vehicles","repositories","vault","inventory",
  ];
  const initialType = allowed.includes(String(query.type || "") as EntityType)
    ? String(query.type) as EntityType
    : "projects";

  const { registry,lookups } = await listControlCenterRegistry(initialType);
  const teams = lookups.teams.map((row) => ({
    value:String(row.code || ""),
    label:String(row.code || "") + " · " + String(row.name || ""),
  }));
  const projects = lookups.projects.map((row) => ({
    value:String(row.slug || ""),
    label:String(row.title || row.slug || ""),
  }));
  const members = lookups.members.map((row) => ({
    value:String(row.id || ""),
    label:String(row.full_name || row.email || ""),
  }));

  return (
    <>
      <PortalPageHeader
        code="CC / CONTROL CENTER"
        title="CORE Control Center"
        lead="Yetkili roller için merkezi registry yönetimi. Üye, rol, takım, proje, görev, araç, repo, Vault ve envanter kayıtlarını tek yüzeyden ara, düzenle ve güvenli lifecycle işlemlerini uygula."
        action={<a className="portalOutlineButton" href="/portal/control">AĞIR KONTROL →</a>}
      />

      {query.saved ? <div className="portalSuccess">Kayıt güncellendi: {query.saved}</div> : null}
      {query.deleted ? <div className="portalSuccess">Silme / arşivleme işlemi uygulandı: {query.deleted}</div> : null}

      <ControlCenterRegistry
        registry={registry}
        initialType={initialType}
        teams={teams}
        projects={projects}
        members={members}
      />
    </>
  );
}
