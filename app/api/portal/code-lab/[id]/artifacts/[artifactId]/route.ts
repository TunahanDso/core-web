import { requirePortalMember } from "@/lib/portal/auth";
import { getPortalCodeRunArtifact } from "@/lib/portal/code-lab";

export const dynamic = "force-dynamic";

function contentDisposition(name: string) {
  const ascii = name.replace(/[^\x20-\x7E]/g,"_").replace(/[\\"]/g,"_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id:string; artifactId:string }> }
) {
  const member = await requirePortalMember();
  const { id,artifactId } = await context.params;
  const result = await getPortalCodeRunArtifact(
    member,
    decodeURIComponent(id),
    decodeURIComponent(artifactId)
  );
  if (!result) return new Response("Artifact not found.",{ status:404 });

  return new Response(result.object.body,{
    headers:{
      "Content-Type":result.artifact.mime_type || "application/octet-stream",
      "Content-Disposition":contentDisposition(result.artifact.name),
      "Cache-Control":"private, no-store, max-age=0",
      "X-Content-Type-Options":"nosniff",
      "X-CORE-Code-Run":decodeURIComponent(id),
    },
  });
}
