import Link from "next/link";
import { notFound } from "next/navigation";
import ControlCenterRegistry from "@/components/portal/ControlCenterRegistry";
import { PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { getControlCenterView } from "@/lib/portal/control-center";
import { memberHasPortalCapability } from "@/lib/portal/governance";

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
    "vault.approve",
  ] as const;
  const capabilityChecks = await Promise.all(
    capabilityNames.map((capability) => memberHasPortalCapability(member,capability))
  );
  if (!capabilityChecks.some(Boolean)) notFound();

  const allowed: EntityType[] = [
    "members","roles","teams","projects","tasks","vehicles","repositories","vault","inventory",
  ];
  const initialType = allowed.includes(String(query.type || "") as EntityType)
    ? String(query.type) as EntityType
    : "projects";
  const view = await getControlCenterView(initialType);
  const registry = Object.fromEntries(allowed.map((type) => [type, type === initialType ? view.rows : []])) as Record<EntityType,Record<string,unknown>[]>;
  const teams = view.teams.map((row) => ({
    value:String(row.code || ""),
    label:String(row.code || "") + " · " + String(row.name || ""),
  }));
  const projects = view.projects.map((row) => ({
    value:String(row.slug || ""),
    label:String(row.title || row.slug || ""),
  }));
  const members = view.members.map((row) => ({
    value:String(row.id || ""),
    label:String(row.full_name || row.email || ""),
  }));

  return (
    <>
      <PortalPageHeader
        code="CC / CONTROL CENTER"
        title="CORE Control Center"
        lead="Yetkili roller için merkezi registry yönetimi. Üye, rol, takım, proje, görev, araç, repo, Vault ve envanter kayıtlarını tek yüzeyden ara, düzenle ve güvenli lifecycle işlemlerini uygula."
        action={<Link prefetch={false} className="portalOutlineButton" href="/portal/control">AĞIR KONTROL →</Link>}
      />

      {query.saved ? <div className="portalSuccess">Kayıt güncellendi: {query.saved}</div> : null}
      {query.deleted ? <div className="portalSuccess">Silme / arşivleme işlemi uygulandı: {query.deleted}</div> : null}

      <ControlCenterRegistry
        registry={registry}
        initialType={initialType}
        teams={teams}
        projects={projects}
        members={members}
        counts={view.counts}
      />
    </>
  );
}
