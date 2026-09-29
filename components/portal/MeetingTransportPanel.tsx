"use client";

import { useEffect, useRef, useState } from "react";

export default function MeetingTransportPanel({
  configured,
  joinUrl,
  provider,
  room,
  mode,
}: {
  configured: boolean;
  joinUrl: string | null;
  provider: string;
  room: string;
  mode: string;
}) {
  const videoRef=useRef<HTMLVideoElement | null>(null);
  const [stream,setStream]=useState<MediaStream | null>(null);
  const [error,setError]=useState("");

  useEffect(()=>()=>stream?.getTracks().forEach((track)=>track.stop()),[stream]);

  const testMedia=async()=>{
    setError("");
    try{
      const media=await navigator.mediaDevices.getUserMedia({
        audio:true,
        video:mode!=="audio",
      });
      setStream(media);
      if(videoRef.current) videoRef.current.srcObject=media;
    }catch(err){
      setError(err instanceof Error ? err.message : "Kamera / mikrofon erişimi alınamadı.");
    }
  };

  const stopMedia=()=>{
    stream?.getTracks().forEach((track)=>track.stop());
    setStream(null);
    if(videoRef.current) videoRef.current.srcObject=null;
  };

  if(configured && joinUrl){
    return (
      <section className="meetingTransportLive">
        <header>
          <div><span>MEETING TRANSPORT</span><b>{provider}</b></div>
          <a href={joinUrl} target="_blank" rel="noreferrer">Yeni pencerede aç ↗</a>
        </header>
        <iframe
          title={"CORE Meeting "+room}
          src={joinUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          referrerPolicy="no-referrer"
        />
      </section>
    );
  }

  return (
    <section className="meetingTransportOffline">
      <header><span>MEDIA TRANSPORT</span><b>SFU / WebRTC sağlayıcısı bağlı değil</b></header>
      <p>
        Toplantı kaydı, takvim, kararlar, oylamalar ve rapor çalışıyor. Çoklu katılımcı ses/görüntü için
        PORTAL_MEETING_PROVIDER_URL üzerinden bir SFU/web meeting sağlayıcısı bağlanmalı.
      </p>
      <div className="meetingLocalPreview">
        <video ref={videoRef} autoPlay playsInline muted />
        <div>
          <button type="button" onClick={testMedia} disabled={Boolean(stream)}>Kamera / mikrofon test et</button>
          <button type="button" onClick={stopMedia} disabled={!stream}>Durdur</button>
        </div>
        {error ? <small>{error}</small> : <small>Bu test yalnız yerel cihaz önizlemesidir; başka katılımcıya medya göndermez.</small>}
      </div>
    </section>
  );
}
