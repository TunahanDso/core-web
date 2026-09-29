"use client";

import { useEffect, useRef, useState } from "react";

const mediaErrors:Record<string,string>={
  NotAllowedError:"Kamera veya mikrofon izni verilmedi. Tarayıcı/site izinlerini kontrol edip yeniden deneyebilirsin.",
  NotFoundError:"Uygun kamera veya mikrofon bulunamadı. Cihaz bağlantısını kontrol et.",
  NotReadableError:"Cihaz başka bir uygulama tarafından kullanılıyor olabilir. Diğer uygulamayı kapatıp yeniden dene.",
  OverconstrainedError:"Bu cihaz istenen ses/görüntü ayarlarını desteklemiyor.",
};

export default function MeetingTransportPanel({configured,joinUrl,provider,room,mode,ended=false}:{
  configured:boolean;joinUrl:string|null;provider:string;room:string;mode:string;ended?:boolean;
}) {
  const videoRef=useRef<HTMLVideoElement|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const requestId=useRef(0);
  const mounted=useRef(true);
  const [active,setActive]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [micOn,setMicOn]=useState(true),[cameraOn,setCameraOn]=useState(true),[joined,setJoined]=useState(false);

  const stopTracks=()=>{streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;if(videoRef.current)videoRef.current.srcObject=null;};
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;requestId.current++;stopTracks();};},[]);
  useEffect(()=>{if(ended){requestId.current++;stopTracks();setActive(false);setBusy(false);setJoined(false);}},[ended]);
  const stopMedia=()=>{requestId.current++;stopTracks();setActive(false);setBusy(false);};
  const testMedia=async()=>{
    if(busy || ended)return;
    const id=++requestId.current;setBusy(true);setError("");
    try {
      if(!navigator.mediaDevices?.getUserMedia)throw new Error("Bu tarayıcı cihaz testini desteklemiyor. Güvenli bağlantıda güncel bir tarayıcı kullan.");
      const media=await navigator.mediaDevices.getUserMedia({audio:true,video:mode!=="audio"});
      if(!mounted.current || id!==requestId.current){media.getTracks().forEach(track=>track.stop());return;}
      stopTracks();streamRef.current=media;setActive(true);setMicOn(true);setCameraOn(mode!=="audio");
      if(videoRef.current)videoRef.current.srcObject=media;
    } catch(err) {
      if(mounted.current && id===requestId.current)setError(err instanceof Error?(mediaErrors[err.name]||"Cihaz testi başlatılamadı. Cihazını ve tarayıcı izinlerini kontrol et."):"Cihaz testi başlatılamadı.");
    } finally {if(mounted.current && id===requestId.current)setBusy(false);}
  };
  const toggleMic=()=>{const next=!micOn;streamRef.current?.getAudioTracks().forEach(t=>{t.enabled=next});setMicOn(next);};
  const toggleCamera=()=>{const next=!cameraOn;streamRef.current?.getVideoTracks().forEach(t=>{t.enabled=next});setCameraOn(next);};

  if(ended || mode==="none")return <section className="meetingTransportOffline"><header><b>{ended?"Toplantı sona erdi":"Kayıt odaklı toplantı"}</b></header><p>Gündem, kararlar ve rapor aşağıda. Bu toplantıda ses/görüntü bağlantısı açılmıyor.</p></section>;
  if(configured && joinUrl)return <section className="meetingTransportLive">
    <header><div><span>TOPLANTI ODASI</span><b>{provider}</b></div><a href={joinUrl} target="_blank" rel="noreferrer">Yeni pencerede aç ↗</a></header>
    {joined?<><div className="meetingMediaControls"><button type="button" onClick={()=>setJoined(false)}>Odadan ayrıl</button></div><iframe title={"CORE Meeting "+room} src={joinUrl} allow="camera; microphone; fullscreen; display-capture; autoplay" referrerPolicy="no-referrer"/></>:<div className="meetingJoinPrompt"><h2>Toplantıya hazır mısın?</h2><p>Katıldığında toplantı sağlayıcısı yüklenir. Kamera ve mikrofon izinlerini tarayıcın sorar.</p><button className="portalPrimaryButton" type="button" onClick={()=>setJoined(true)}>Toplantıya katıl</button></div>}
  </section>;
  return <section className="meetingTransportOffline">
    <header><b>Ses/görüntü bağlantısı henüz hazır değil</b></header>
    <p>Notları, kararları, oylamaları ve arşiv raporunu kullanabilirsin. Çok katılımcılı görüşme için yöneticinin toplantı hizmetini bağlaması gerekiyor.</p>
    <div className="meetingLocalPreview">
      {mode!=="audio"?<video ref={videoRef} autoPlay playsInline muted aria-label="Yerel kamera önizlemesi"/>:<p className="meetingAudioState" role="status">{active?(micOn?"Mikrofon testi açık":"Mikrofon sessizde"):"Mikrofon testi hazır"}</p>}
      <div className="meetingMediaControls">
        <button type="button" onClick={testMedia} disabled={active||busy}>{busy?"İzin bekleniyor…":mode==="audio"?"Mikrofonu test et":"Kamera / mikrofon test et"}</button>
        {active?<><button type="button" aria-pressed={micOn} onClick={toggleMic}>{micOn?"Mikrofonu kapat":"Mikrofonu aç"}</button>{mode!=="audio"?<button type="button" aria-pressed={cameraOn} onClick={toggleCamera}>{cameraOn?"Kamerayı kapat":"Kamerayı aç"}</button>:null}</>:null}
        <button type="button" onClick={stopMedia} disabled={!active&&!busy}>Testi durdur</button>
      </div>
      {error?<p role="alert">{error}</p>:<small>Yalnızca bu cihazda önizleme. Diğer katılımcılara ses/görüntü gönderilmez ve kayıt alınmaz.</small>}
    </div>
  </section>;
}
