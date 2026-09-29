"use client";

import { FormEvent, useMemo, useState } from "react";

const MAX_BYTES = 25 * 1024 * 1024;

function humanBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function VaultRevisionUploadForm({ fileId }: { fileId: string }) {
  const [uploading,setUploading] = useState(false);
  const [progress,setProgress] = useState(0);
  const [error,setError] = useState("");
  const [fileName,setFileName] = useState("");
  const [fileSize,setFileSize] = useState(0);

  const status = useMemo(() => {
    if (error) return error;
    if (uploading) return "Yeni revision R2 Vault'a aktarılıyor · %" + progress;
    if (fileName) return fileName + " · " + humanBytes(fileSize);
    return "Yeni kaynak dosyayı seç.";
  },[error,uploading,progress,fileName,fileSize]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    const data = new FormData(event.currentTarget);
    const file = data.get("file");

    if (!(file instanceof File) || file.size <= 0) {
      setError("Yeni revision dosyasını seçmelisin.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Tek dosya üst sınırı 25 MB. Seçilen dosya: " + humanBytes(file.size));
      return;
    }

    setUploading(true);
    setProgress(0);
    setError("");

    try {
      const result = await new Promise<{ href?: string; error?: string }>((resolve,reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST","/api/portal/vault/" + encodeURIComponent(fileId) + "/versions",true);
        xhr.responseType = "json";
        xhr.setRequestHeader("Accept","application/json");
        xhr.upload.addEventListener("progress",(progressEvent) => {
          if (!progressEvent.lengthComputable) return;
          setProgress(Math.max(0,Math.min(100,Math.round((progressEvent.loaded / progressEvent.total) * 100))));
        });
        xhr.addEventListener("load",() => {
          const payload = xhr.response && typeof xhr.response === "object"
            ? xhr.response as { href?: string; error?: string }
            : {};
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(payload);
          } else {
            reject(new Error(payload.error || "Revision yüklemesi HTTP " + xhr.status + " ile başarısız oldu."));
          }
        });
        xhr.addEventListener("error",() => reject(new Error("Revision upload bağlantısı kesildi.")));
        xhr.send(data);
      });

      setProgress(100);
      window.location.assign(result.href || ("/portal/library/" + encodeURIComponent(fileId) + "?versioned=1"));
    } catch (uploadError) {
      setUploading(false);
      setError(uploadError instanceof Error ? uploadError.message : "Revision yüklemesi başarısız.");
    }
  }

  return (
    <form className="portalFormGrid vaultAsyncUploadForm" onSubmit={submit}>
      <label className="portalFormWide vaultFilePicker">
        <span>Yeni dosya</span>
        <input
          name="file"
          type="file"
          required
          disabled={uploading}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] || null;
            setFileName(file?.name || "");
            setFileSize(file?.size || 0);
            setError("");
          }}
        />
        <small>{status}</small>
      </label>

      <label className="portalFormWide">
        <span>Revision notu</span>
        <input
          name="note"
          placeholder="R2: konnektör yerleşimi ve güç katı güncellendi"
          disabled={uploading}
        />
      </label>

      <div className={"vaultUploadStatus " + (error ? "error" : uploading ? "uploading" : "idle")}>
        <div className="vaultUploadStatusHead">
          <span>REVISION UPLOAD</span>
          <b>{uploading ? progress + "%" : fileName ? humanBytes(fileSize) : "25 MB MAX"}</b>
        </div>
        <div className="vaultUploadProgress" aria-hidden="true"><i style={{ width:progress + "%" }} /></div>
        <p>{status}</p>
      </div>

      <button className="portalPrimaryButton" type="submit" disabled={uploading}>
        {uploading ? "REVISION YÜKLENİYOR · %" + progress : "YENİ REVISION YÜKLE →"}
      </button>
    </form>
  );
}
