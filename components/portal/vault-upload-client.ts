export type VaultUploadSessionResponse = {
  sessionId: string;
  fileId: string;
  revision: number;
  expiresAt: string;
  uploadUrl: string;
  completeUrl: string;
};

async function parseJson(response: Response) {
  const payload = await response.json().catch(() => ({})) as Record<string,unknown>;
  if (!response.ok) {
    throw new Error(String(payload.error || "Vault isteği HTTP " + response.status + " ile başarısız oldu."));
  }
  return payload;
}

export async function initVaultUpload(input: {
  mode: "new" | "revision";
  targetFileId?: string;
  file: File;
  metadata: Record<string,unknown>;
}) {
  const response = await fetch("/api/portal/vault/uploads/init",{
    method:"POST",
    headers:{
      "content-type":"application/json",
      "accept":"application/json",
    },
    body:JSON.stringify({
      mode:input.mode,
      targetFileId:input.targetFileId || null,
      fileName:input.file.name,
      mimeType:input.file.type || "application/octet-stream",
      sizeBytes:input.file.size,
      metadata:input.metadata,
    }),
  });
  return await parseJson(response) as unknown as VaultUploadSessionResponse;
}

export function putVaultUpload(
  session: VaultUploadSessionResponse,
  file: File,
  onProgress: (progress:number) => void
) {
  return new Promise<void>((resolve,reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT",session.uploadUrl,true);
    xhr.responseType = "json";
    xhr.setRequestHeader("Accept","application/json");
    xhr.setRequestHeader("Content-Type",file.type || "application/octet-stream");

    xhr.upload.addEventListener("progress",(event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.max(0,Math.min(96,Math.round((event.loaded / event.total) * 96))));
    });

    xhr.addEventListener("load",() => {
      const payload = xhr.response && typeof xhr.response === "object"
        ? xhr.response as Record<string,unknown>
        : {};
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(97);
        resolve();
        return;
      }
      reject(new Error(String(payload.error || "Raw Vault upload HTTP " + xhr.status + " ile başarısız oldu.")));
    });
    xhr.addEventListener("error",() => reject(new Error("Vault raw upload bağlantısı kesildi.")));
    xhr.addEventListener("abort",() => reject(new Error("Vault yüklemesi iptal edildi.")));
    xhr.send(file);
  });
}

export async function completeVaultUpload(session: VaultUploadSessionResponse) {
  const response = await fetch(session.completeUrl,{
    method:"POST",
    headers:{
      "accept":"application/json",
    },
  });
  const payload = await parseJson(response);
  return payload as { href?: string; fileId?: string; revision?: number };
}

export async function executeVaultUpload(input: {
  mode: "new" | "revision";
  targetFileId?: string;
  file: File;
  metadata: Record<string,unknown>;
  onProgress: (progress:number) => void;
}) {
  input.onProgress(1);
  const session = await initVaultUpload(input);
  input.onProgress(3);
  await putVaultUpload(session,input.file,input.onProgress);
  input.onProgress(98);
  const result = await completeVaultUpload(session);
  input.onProgress(100);
  return result;
}
