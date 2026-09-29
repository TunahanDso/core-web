"use client";

import { FormEvent, useMemo, useState } from "react";
import { executeVaultUpload } from "@/components/portal/vault-upload-client";

const MAX_BYTES = 25 * 1024 * 1024;

type UploadState = "idle" | "uploading" | "success" | "error";

function humanBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function field(data: FormData,key: string) {
  return String(data.get(key) ?? "").trim();
}

export default function VaultUploadForm() {
  const [state,setState] = useState<UploadState>("idle");
  const [progress,setProgress] = useState(0);
  const [error,setError] = useState("");
  const [fileName,setFileName] = useState("");
  const [fileSize,setFileSize] = useState(0);

  const statusText = useMemo(() => {
    if (state === "uploading") {
      if (progress < 4) return "Upload session hazırlanıyor…";
      if (progress < 98) return "Dosya raw PUT ile R2 Vault'a aktarılıyor · %" + progress;
      return "R2 tamam · checksum ve revision finalize ediliyor…";
    }
    if (state === "success") return "Yükleme tamamlandı. Dosya açılıyor…";
    if (state === "error") return error;
    if (fileName) return fileName + " · " + humanBytes(fileSize);
    return "Dosya seçilmedi.";
  },[state,progress,error,fileName,fileSize]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "uploading") return;
    const data = new FormData(event.currentTarget);
    const file = data.get("file");

    if (!(file instanceof File) || file.size <= 0) {
      setState("error");
      setError("Yüklenecek dosyayı seçmelisin.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setState("error");
      setError("Tek dosya üst sınırı 25 MB. Seçilen dosya: " + humanBytes(file.size));
      return;
    }

    setError("");
    setProgress(0);
    setState("uploading");

    try {
      const result = await executeVaultUpload({
        mode:"new",
        file,
        metadata:{
          kind:field(data,"kind") || "document",
          title:field(data,"title"),
          teamCode:field(data,"teamCode") || null,
          projectSlug:field(data,"projectSlug") || null,
          visibility:field(data,"visibility") || "members",
          description:field(data,"description"),
          tags:field(data,"tags")
            .split(",")
            .map((item)=>item.trim().toLowerCase())
            .filter(Boolean),
        },
        onProgress:setProgress,
      });
      setState("success");
      window.location.assign(result.href || "/portal/library");
    } catch (uploadError) {
      setState("error");
      setError(uploadError instanceof Error ? uploadError.message : "Vault yüklemesi başarısız.");
    }
  }

  return (
    <form className="portalFormGrid vaultAsyncUploadForm" onSubmit={submit}>
      <label>
        <span>Tür</span>
        <select name="kind" defaultValue="document" disabled={state === "uploading"}>
          <option value="document">Doküman</option>
          <option value="library">Kütüphane</option>
          <option value="procedure">Prosedür</option>
          <option value="dataset">Veri Seti</option>
          <option value="code">Kod</option>
          <option value="firmware">Firmware</option>
          <option value="simulation">Simülasyon</option>
          <option value="drawing">Çizim</option>
          <option value="mechanical">Mekanik</option>
          <option value="cad">CAD</option>
          <option value="pcb">PCB</option>
          <option value="electronics">Elektronik</option>
          <option value="bom">BOM</option>
          <option value="media">Medya</option>
          <option value="archive">Arşiv</option>
        </select>
      </label>

      <label>
        <span>Başlık</span>
        <input name="title" placeholder="HYD-01 güç dağıtım kartı R1" required disabled={state === "uploading"} />
      </label>

      <label>
        <span>Takım</span>
        <input name="teamCode" placeholder="MAR / SYS / EMB" disabled={state === "uploading"} />
      </label>

      <label>
        <span>Proje slug</span>
        <input name="projectSlug" placeholder="hydronom" disabled={state === "uploading"} />
      </label>

      <label>
        <span>Görünürlük</span>
        <select name="visibility" defaultValue="members" disabled={state === "uploading"}>
          <option value="members">Tüm üyeler</option>
          <option value="team">Takım</option>
          <option value="leads">Liderler</option>
          <option value="admins">Admin</option>
        </select>
      </label>

      <label className="portalFormWide vaultFilePicker">
        <span>Dosya</span>
        <input
          name="file"
          type="file"
          required
          disabled={state === "uploading"}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] || null;
            setFileName(file?.name || "");
            setFileSize(file?.size || 0);
            if (state === "error") {
              setState("idle");
              setError("");
            }
          }}
        />
        <small>{fileName ? statusText : "CAD, PCB, doküman ve diğer mühendislik dosyaları · maksimum 25 MB"}</small>
      </label>

      <label className="portalFormWide">
        <span>Açıklama</span>
        <textarea
          name="description"
          rows={3}
          placeholder="Bu revision neyi içeriyor, hangi kararın kanıtı?"
          disabled={state === "uploading"}
        />
      </label>

      <label className="portalFormWide">
        <span>Etiketler</span>
        <input name="tags" placeholder="navigation, imu, smoke-test, pcb-r1" disabled={state === "uploading"} />
      </label>

      <div className={"vaultUploadStatus " + state}>
        <div className="vaultUploadStatusHead">
          <span>{state === "uploading" ? "RAW R2 UPLOAD" : state === "success" ? "READY" : state === "error" ? "ERROR" : "VAULT"}</span>
          <b>{state === "uploading" ? progress + "%" : fileName ? humanBytes(fileSize) : "25 MB MAX"}</b>
        </div>
        <div className="vaultUploadProgress" aria-hidden="true">
          <i style={{ width:(state === "success" ? 100 : progress) + "%" }} />
        </div>
        <p>{statusText}</p>
      </div>

      <button type="submit" className="portalPrimaryButton" disabled={state === "uploading" || state === "success"}>
        {state === "uploading" ? "R2'YE AKTARILIYOR · %" + progress : state === "success" ? "DOSYA AÇILIYOR…" : "R2 VAULT'A YÜKLE →"}
      </button>
    </form>
  );
}
