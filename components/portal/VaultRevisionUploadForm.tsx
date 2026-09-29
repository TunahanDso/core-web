"use client";

import { FormEvent, useMemo, useState } from "react";
import { executeVaultUpload } from "@/components/portal/vault-upload-client";

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
    if (uploading) {
      if (progress < 4) return "Revision upload session hazırlanıyor…";
      if (progress < 98) return "Yeni revision raw PUT ile R2'ye aktarılıyor · %" + progress;
      return "R2 tamam · revision metadata finalize ediliyor…";
    }
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
      const result = await executeVaultUpload({
        mode:"revision",
        targetFileId:fileId,
        file,
        metadata:{ note:String(data.get("note") ?? "").trim() },
        onProgress:setProgress,
      });
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
          <span>RAW REVISION UPLOAD</span>
          <b>{uploading ? progress + "%" : fileName ? humanBytes(fileSize) : "25 MB MAX"}</b>
        </div>
        <div className="vaultUploadProgress" aria-hidden="true"><i style={{ width:progress + "%" }} /></div>
        <p>{status}</p>
      </div>

      <button className="portalPrimaryButton" type="submit" disabled={uploading}>
        {uploading ? "REVISION R2'YE AKTARILIYOR · %" + progress : "YENİ REVISION YÜKLE →"}
      </button>
    </form>
  );
}
