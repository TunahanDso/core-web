"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerAndroidScanningLibrary,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerScanOrientation,
  CapacitorBarcodeScannerTypeHintALLOption,
} from "@capacitor/barcode-scanner";
import { Haptics, NotificationType } from "@capacitor/haptics";

function normalizeInventoryCode(raw: string) {
  const value = raw.trim();
  if (!value) return "";

  const upper = value.toUpperCase();
  if (upper.startsWith("YTUC-INV:")) return value.slice(9).trim();
  if (upper.startsWith("CORE-INV:")) return value.slice(9).trim();

  try {
    const url = new URL(value);
    if (url.hostname === "ytucore.com") {
      const querySku = url.searchParams.get("sku");
      if (querySku) return querySku.trim();
      const match = url.pathname.match(/\/portal\/inventory\/sku\/([^/]+)/i);
      if (match?.[1]) return decodeURIComponent(match[1]).trim();
    }
  } catch {
    // Plain barcode / SKU.
  }

  return value;
}

export default function PortalInventoryScanner() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const native = Capacitor.isNativePlatform();

  if (!native) return null;

  const scan = async () => {
    if (scanning) return;
    setScanning(true);
    setError("");

    try {
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHintALLOption.ALL,
        cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
        scanOrientation: CapacitorBarcodeScannerScanOrientation.ADAPTIVE,
        scanInstructions: "CORE envanter QR veya barkodunu kadraja getir.",
        scanButton: false,
        android: {
          scanningLibrary: CapacitorBarcodeScannerAndroidScanningLibrary.MLKIT,
        },
      });

      const code = normalizeInventoryCode(String(result.ScanResult || ""));
      if (!code) throw new Error("Kod okunamadı.");

      await Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
      router.push("/portal/inventory?scan=" + encodeURIComponent(code));
      router.refresh();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Tarama başlatılamadı.";
      if (!/cancel|canceled|cancelled/i.test(message)) {
        setError(message);
        await Haptics.notification({ type: NotificationType.Error }).catch(() => undefined);
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <section className="nativeInventoryScanner">
      <button type="button" onClick={() => void scan()} disabled={scanning}>
        <span className="nativeScannerIcon" aria-hidden="true">
          <i /><i /><i /><i />
        </span>
        <div>
          <b>{scanning ? "TARAYICI AÇILIYOR..." : "QR / BARKOD TARA"}</b>
          <small>SKU'yu bul, stok hareketini tek dokunuşla hazırla.</small>
        </div>
        <strong>→</strong>
      </button>
      {error ? <p>{error}</p> : null}
    </section>
  );
}
