import { getPortalMember } from "@/lib/portal/auth";
import { createPortalVaultFile } from "@/lib/portal/vault";

export const dynamic = "force-dynamic";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function tags(value: string) {
  return Array.from(new Set(
    value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)
  )).slice(0,30);
}

export async function POST(request: Request) {
  const member = await getPortalMember();
  if (!member) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return Response.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "missing_file" }, { status: 400 });
  }

  const visibilityRaw = text(formData,"visibility");
  const visibility = ["members","team","leads","admins"].includes(visibilityRaw)
    ? visibilityRaw as "members" | "team" | "leads" | "admins"
    : "members";

  try {
    const fileId = await createPortalVaultFile({
      file,
      title: text(formData,"title"),
      description: text(formData,"description"),
      kind: text(formData,"kind") || "media",
      teamCode: text(formData,"teamCode") || null,
      projectSlug: text(formData,"projectSlug") || null,
      tags: tags(text(formData,"tags")),
      visibility,
      actorEmail: member.email,
    });

    return Response.json({
      uploaded: true,
      fileId,
      href: "/portal/library/" + encodeURIComponent(fileId),
    }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    return Response.json({
      uploaded: false,
      error: error instanceof Error ? error.message : "Vault yüklemesi başarısız.",
    }, {
      status: 400,
      headers: { "Cache-Control": "no-store, private" },
    });
  }
}
