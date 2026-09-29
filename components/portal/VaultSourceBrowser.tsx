"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Chunk = {
  text:string;
  offset:number;
  nextOffset:number;
  eof:boolean;
  totalBytes:number;
  revision:number;
  originalName:string;
};

const CHUNK_BYTES=192*1024;

function humanBytes(bytes:number){
  if(bytes<1024) return bytes+" B";
  if(bytes<1024*1024) return (bytes/1024).toFixed(1)+" KB";
  return (bytes/(1024*1024)).toFixed(1)+" MB";
}

export default function VaultSourceBrowser({
  fileId,
  revision,
  filename,
}:{
  fileId:string;
  revision?:number;
  filename:string;
}){
  const [chunk,setChunk]=useState<Chunk|null>(null);
  const [offset,setOffset]=useState(0);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [query,setQuery]=useState("");

  const load=useCallback(async(nextOffset:number)=>{
    setLoading(true);
    setError("");
    try{
      const params=new URLSearchParams({
        offset:String(Math.max(0,nextOffset)),
        limit:String(CHUNK_BYTES),
      });
      if(revision) params.set("revision",String(revision));
      const response=await fetch(
        "/api/portal/vault/"+encodeURIComponent(fileId)+"/source?"+params.toString(),
        {headers:{Accept:"application/json"}}
      );
      const payload=await response.json().catch(()=>({})) as Partial<Chunk>&{error?:string};
      if(!response.ok) throw new Error(payload.error||("HTTP "+response.status));
      const next=payload as Chunk;
      setChunk(next);
      setOffset(next.offset);
    }catch(loadError){
      setError(loadError instanceof Error?loadError.message:"Kaynak penceresi açılamadı.");
    }finally{
      setLoading(false);
    }
  },[fileId,revision]);

  useEffect(()=>{void load(0);},[load]);

  const lines=useMemo(()=>chunk?.text.split(/\r?\n/)||[],[chunk]);
  const normalized=query.trim().toLocaleLowerCase("tr-TR");
  const matchCount=useMemo(()=>{
    if(!normalized) return 0;
    let count=0;
    for(const line of lines){
      if(line.toLocaleLowerCase("tr-TR").includes(normalized)) count+=1;
    }
    return count;
  },[lines,normalized]);

  const previous=Math.max(0,offset-CHUNK_BYTES);
  const next=chunk?.nextOffset||0;
  const percent=chunk?.totalBytes
    ? Math.min(100,Math.round((chunk.nextOffset/chunk.totalBytes)*100))
    : 0;

  return(
    <section className="vaultSourceBrowser">
      <header>
        <div>
          <span>LARGE SOURCE BROWSER</span>
          <b>{filename}</b>
          <small>
            {chunk
              ? humanBytes(chunk.offset)+" – "+humanBytes(chunk.nextOffset)+" / "+humanBytes(chunk.totalBytes)
              : "Kaynak penceresi hazırlanıyor…"}
          </small>
        </div>
        <div className="vaultSourceWindowActions">
          <button type="button" onClick={()=>void load(0)} disabled={loading||offset===0}>BAŞA</button>
          <button type="button" onClick={()=>void load(previous)} disabled={loading||offset===0}>← ÖNCEKİ</button>
          <button type="button" onClick={()=>void load(next)} disabled={loading||Boolean(chunk?.eof)}>SONRAKİ →</button>
        </div>
      </header>

      <div className="vaultSourceBrowserBar">
        <label>
          <span>⌕</span>
          <input
            value={query}
            onChange={(event)=>setQuery(event.target.value)}
            placeholder="Bu kaynak penceresinde ara…"
          />
          {normalized?<b>{matchCount}</b>:null}
        </label>
        <div>
          <span>WINDOW</span>
          <b>{humanBytes(CHUNK_BYTES)}</b>
        </div>
        <div>
          <span>PROGRESS</span>
          <b>{percent}%</b>
        </div>
      </div>

      <div className="vaultSourceProgress" aria-hidden="true">
        <i style={{width:percent+"%"}}/>
      </div>

      {error?<div className="vaultViewerOverlay error">{error}</div>:null}
      {loading&&!chunk?<div className="vaultSourceLoading">R2 kaynağından güvenli pencere okunuyor…</div>:null}

      {chunk?(
        <div className="vaultSourceViewport">
          <table>
            <tbody>
              {lines.map((line,index)=>{
                const hit=Boolean(normalized)&&line.toLocaleLowerCase("tr-TR").includes(normalized);
                return(
                  <tr className={hit?"match":""} key={index}>
                    <td className="lineNumber">{index+1}</td>
                    <td className="lineSource"><code>{line||" "}</code></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ):null}

      <footer>
        <span>Kaynağın tamamı tek seferde DOM'a basılmaz.</span>
        <span>{chunk?.eof?"DOSYA SONU":"192 KB pencere · ileri/geri gezinti"}</span>
      </footer>
    </section>
  );
}
