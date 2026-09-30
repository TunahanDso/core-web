"use client";

import { useEffect, useRef, useState } from "react";

type RealtimeMeeting = {
  leave?:()=>Promise<void>|void;
};

type RealtimeMeetingElement = HTMLElement & {
  meeting?:RealtimeMeeting;
  showSetupScreen?:boolean;
};

declare global {
  interface Window {
    RealtimeKitClient?:{
      init(options:{
        authToken:string;
        defaults?:{audio?:boolean;video?:boolean};
      }):Promise<RealtimeMeeting>;
    };
    __CORE_RTK_UI_READY__?:boolean;
  }
}

const mediaErrors:Record<string,string>={
  NotAllowedError:"Kamera veya mikrofon izni verilmedi. Tarayıcı/site izinlerini kontrol edip yeniden deneyebilirsin.",
  NotFoundError:"Uygun kamera veya mikrofon bulunamadı. Cihaz bağlantısını kontrol et.",
  NotReadableError:"Cihaz başka bir uygulama tarafından kullanılıyor olabilir. Diğer uygulamayı kapatıp yeniden dene.",
  OverconstrainedError:"Bu cihaz istenen ses/görüntü ayarlarını desteklemiyor.",
};

let runtimePromise:Promise<void>|null=null;

function loadScript(src:string,type?:"module") {
  return new Promise<void>((resolve,reject)=>{
    const existing=document.querySelector<HTMLScriptElement>(`script[data-core-src="${src}"]`);
    if(existing){
      if(existing.dataset.loaded==="1") return resolve();
      existing.addEventListener("load",()=>resolve(),{once:true});
      existing.addEventListener("error",()=>reject(new Error("Toplantı istemcisi yüklenemedi.")),{once:true});
      return;
    }
    const script=document.createElement("script");
    script.src=src;
    script.async=true;
    script.dataset.coreSrc=src;
    if(type) script.type=type;
    script.addEventListener("load",()=>{script.dataset.loaded="1";resolve();},{once:true});
    script.addEventListener("error",()=>reject(new Error("Toplantı istemcisi yüklenemedi.")),{once:true});
    document.head.appendChild(script);
  });
}

async function loadRealtimeKitRuntime() {
  if(window.RealtimeKitClient && customElements.get("rtk-meeting")) return;
  if(!runtimePromise){
    runtimePromise=(async()=>{
      await Promise.all([
        loadScript("https://cdn.jsdelivr.net/npm/@cloudflare/realtimekit@2.0.2/dist/browser.js"),
        loadScript("/realtimekit-loader.js","module"),
      ]);
      await customElements.whenDefined("rtk-meeting");
      if(!window.RealtimeKitClient) throw new Error("RealtimeKit çekirdeği başlatılamadı.");
    })().catch((error)=>{
      runtimePromise=null;
      throw error;
    });
  }
  await runtimePromise;
}

export default function MeetingTransportPanel({
  configured,
  realtime,
  joinUrl,
  provider,
  room,
  mode,
  meetingId,
  ended=false,
}:{
  configured:boolean;
  realtime:boolean;
  joinUrl:string|null;
  provider:string;
  room:string;
  mode:string;
  meetingId:string;
  ended?:boolean;
}) {
  const videoRef=useRef<HTMLVideoElement|null>(null);
  const realtimeContainerRef=useRef<HTMLDivElement|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const meetingRef=useRef<RealtimeMeeting|null>(null);
  const requestId=useRef(0);
  const mounted=useRef(true);
  const [active,setActive]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [micOn,setMicOn]=useState(true),[cameraOn,setCameraOn]=useState(true),[joined,setJoined]=useState(false);

  const stopTracks=()=>{
    streamRef.current?.getTracks().forEach(track=>track.stop());
    streamRef.current=null;
    if(videoRef.current)videoRef.current.srcObject=null;
  };

  const leaveRealtime=async()=>{
    requestId.current++;
    const meeting=meetingRef.current;
    meetingRef.current=null;
    try { await meeting?.leave?.(); } catch {}
    if(realtimeContainerRef.current) realtimeContainerRef.current.replaceChildren();
    if(mounted.current){
      setJoined(false);
      setBusy(false);
    }
  };

  useEffect(()=>{
    mounted.current=true;
    return()=>{
      mounted.current=false;
      requestId.current++;
      stopTracks();
      const meeting=meetingRef.current;
      meetingRef.current=null;
      void meeting?.leave?.();
    };
  },[]);

  useEffect(()=>{
    if(ended){
      requestId.current++;
      stopTracks();
      setActive(false);
      setBusy(false);
      void leaveRealtime();
    }
  },[ended]);

  const stopMedia=()=>{requestId.current++;stopTracks();setActive(false);setBusy(false);};

  const testMedia=async()=>{
    if(busy || ended)return;
    const id=++requestId.current;
    setBusy(true);
    setError("");
    try {
      if(!navigator.mediaDevices?.getUserMedia) throw new Error("Bu tarayıcı cihaz testini desteklemiyor. Güvenli bağlantıda güncel bir tarayıcı kullan.");
      const media=await navigator.mediaDevices.getUserMedia({audio:true,video:mode!=="audio"});
      if(!mounted.current || id!==requestId.current){media.getTracks().forEach(track=>track.stop());return;}
      stopTracks();
      streamRef.current=media;
      setActive(true);
      setMicOn(true);
      setCameraOn(mode!=="audio");
      if(videoRef.current)videoRef.current.srcObject=media;
    } catch(err) {
      if(mounted.current && id===requestId.current){
        setError(err instanceof Error?(mediaErrors[err.name]||err.message||"Cihaz testi başlatılamadı."):"Cihaz testi başlatılamadı.");
      }
    } finally {
      if(mounted.current && id===requestId.current)setBusy(false);
    }
  };

  const joinRealtime=async()=>{
    if(busy || ended || joined)return;
    const id=++requestId.current;
    setBusy(true);
    setError("");
    try {
      const response=await fetch("/api/portal/meetings/"+encodeURIComponent(meetingId)+"/realtime",{
        method:"POST",
        headers:{"Accept":"application/json"},
        credentials:"same-origin",
      });
      const payload=await response.json().catch(()=>({})) as {authToken?:string;error?:string};
      if(!response.ok || !payload.authToken) throw new Error(payload.error || "Toplantı katılım anahtarı alınamadı.");

      await loadRealtimeKitRuntime();
      if(!mounted.current || id!==requestId.current)return;
      const client=window.RealtimeKitClient;
      if(!client) throw new Error("RealtimeKit istemcisi hazır değil.");
      const meeting=await client.init({
        authToken:payload.authToken,
        defaults:{audio:true,video:mode!=="audio"},
      });
      if(!mounted.current || id!==requestId.current){
        await meeting.leave?.();
        return;
      }

      meetingRef.current=meeting;
      const container=realtimeContainerRef.current;
      if(!container) throw new Error("Toplantı görünümü hazırlanamadı.");
      container.replaceChildren();
      const element=document.createElement("rtk-meeting") as RealtimeMeetingElement;
      element.setAttribute("show-setup-screen","true");
      element.showSetupScreen=true;
      element.meeting=meeting;
      container.appendChild(element);
      setJoined(true);
    } catch(err) {
      if(mounted.current && id===requestId.current){
        setError(err instanceof Error ? err.message : "Toplantıya bağlanılamadı.");
      }
    } finally {
      if(mounted.current && id===requestId.current)setBusy(false);
    }
  };

  const toggleMic=()=>{
    const next=!micOn;
    streamRef.current?.getAudioTracks().forEach(track=>{track.enabled=next});
    setMicOn(next);
  };
  const toggleCamera=()=>{
    const next=!cameraOn;
    streamRef.current?.getVideoTracks().forEach(track=>{track.enabled=next});
    setCameraOn(next);
  };

  if(ended || mode==="none"){
    return <section className="meetingTransportOffline">
      <header><b>{ended?"Toplantı sona erdi":"Kayıt odaklı toplantı"}</b></header>
      <p>Gündem, kararlar ve rapor aşağıda. Bu toplantıda ses/görüntü bağlantısı açılmıyor.</p>
    </section>;
  }

  if(configured && realtime){
    return <section className="meetingTransportLive meetingRealtimeKit">
      <header>
        <div><span>CORE REALTIME</span><b>Cloudflare RealtimeKit · {room}</b></div>
        {joined?<button type="button" onClick={()=>void leaveRealtime()}>Odadan ayrıl</button>:<span>SFU · WebRTC</span>}
      </header>
      <div className="meetingRealtimeStage">
        <div ref={realtimeContainerRef} className={joined?"meetingRealtimeMount active":"meetingRealtimeMount"} />
        {!joined?(
          <div className="meetingJoinPrompt">
            <span>SES · GÖRÜNTÜ · EKRAN PAYLAŞIMI</span>
            <h2>CORE toplantı odasına katıl</h2>
            <p>Katılım anahtarın yalnız bu oturum için backend tarafından oluşturulur. Kamera ve mikrofon iznini toplantı öncesi ekranda seçebilirsin.</p>
            <button className="portalPrimaryButton" type="button" onClick={()=>void joinRealtime()} disabled={busy}>
              {busy?"Güvenli oda hazırlanıyor…":"Toplantıya katıl"}
            </button>
            {error?<p className="meetingTransportError" role="alert">{error}</p>:null}
          </div>
        ):null}
      </div>
    </section>;
  }

  if(configured && joinUrl){
    return <section className="meetingTransportLive">
      <header><div><span>TOPLANTI ODASI</span><b>{provider}</b></div><a href={joinUrl} target="_blank" rel="noreferrer">Yeni pencerede aç ↗</a></header>
      {joined?(
        <>
          <div className="meetingMediaControls"><button type="button" onClick={()=>setJoined(false)}>Odadan ayrıl</button></div>
          <iframe title={"CORE Meeting "+room} src={joinUrl} allow="camera; microphone; fullscreen; display-capture; autoplay" referrerPolicy="no-referrer"/>
        </>
      ):(
        <div className="meetingJoinPrompt">
          <h2>Toplantıya hazır mısın?</h2>
          <p>Katıldığında toplantı sağlayıcısı yüklenir. Kamera ve mikrofon izinlerini tarayıcın sorar.</p>
          <button className="portalPrimaryButton" type="button" onClick={()=>setJoined(true)}>Toplantıya katıl</button>
        </div>
      )}
    </section>;
  }

  return <section className="meetingTransportOffline">
    <header><b>Gerçek zamanlı toplantı servisi yapılandırılmadı</b></header>
    <p>CORE toplantı ekranı hazır; ses, görüntü ve ekran paylaşımı için Cloudflare RealtimeKit Worker yapılandırmasının tamamlanması gerekiyor.</p>
    <div className="meetingLocalPreview">
      {mode!=="audio"?<video ref={videoRef} autoPlay playsInline muted aria-label="Yerel kamera önizlemesi"/>:<p className="meetingAudioState" role="status">{active?(micOn?"Mikrofon testi açık":"Mikrofon sessizde"):"Mikrofon testi hazır"}</p>}
      <div className="meetingMediaControls">
        <button type="button" onClick={testMedia} disabled={active||busy}>{busy?"İzin bekleniyor…":mode==="audio"?"Mikrofonu test et":"Kamera / mikrofon test et"}</button>
        {active?<><button type="button" aria-pressed={micOn} onClick={toggleMic}>{micOn?"Mikrofonu kapat":"Mikrofonu aç"}</button>{mode!=="audio"?<button type="button" aria-pressed={cameraOn} onClick={toggleCamera}>{cameraOn?"Kamerayı kapat":"Kamerayı aç"}</button>:null}</>:null}
        <button type="button" onClick={stopMedia} disabled={!active&&!busy}>Testi durdur</button>
      </div>
      {error?<p role="alert">{error}</p>:<small>Yerel önizleme çalışıyor. RealtimeKit yapılandırılana kadar medya diğer katılımcılara gönderilmez.</small>}
    </div>
  </section>;
}
