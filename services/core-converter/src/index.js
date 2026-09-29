function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});}
function esc(value){return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");}
function parseEdges(source){
  const edges=[];
  const line=/\(gr_line[\s\S]{0,180}?\(start\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,180}?\(end\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,360}?\(layer\s+"Edge\.Cuts"\)/g;
  for(const m of source.matchAll(line)){edges.push([Number(m[1]),Number(m[2]),Number(m[3]),Number(m[4])]);if(edges.length>=12000)break;}
  const rect=/\(gr_rect[\s\S]{0,180}?\(start\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,180}?\(end\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,360}?\(layer\s+"Edge\.Cuts"\)/g;
  for(const m of source.matchAll(rect)){
    const x1=Number(m[1]),y1=Number(m[2]),x2=Number(m[3]),y2=Number(m[4]);
    edges.push([x1,y1,x2,y1],[x2,y1,x2,y2],[x2,y2,x1,y2],[x1,y2,x1,y1]);
    if(edges.length>=12000)break;
  }
  return edges.filter(e=>e.every(Number.isFinite));
}
function edgeSvg(edges,label){
  if(!edges.length) throw new Error("Edge.Cuts geometry not found.");
  const xs=edges.flatMap(e=>[e[0],e[2]]),ys=edges.flatMap(e=>[e[1],e[3]]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const w=Math.max(1,maxX-minX),h=Math.max(1,maxY-minY),pad=Math.max(w,h)*.04;
  const lines=edges.map(e=>'<line x1="'+e[0]+'" y1="'+e[1]+'" x2="'+e[2]+'" y2="'+e[3]+'" />').join("");
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(minX-pad)+' '+(minY-pad)+' '+(w+2*pad)+' '+(h+2*pad)+'"><title>'+esc(label)+'</title><g fill="none" stroke="#ff6500" stroke-width="'+Math.max(.15,Math.max(w,h)/600)+'" vector-effect="non-scaling-stroke">'+lines+'</g></svg>';
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method==="GET"&&url.pathname==="/health") return json({ok:true,service:"core-converter",engines:["kicad-edge-svg-v1"]});
    if(request.method!=="POST"||url.pathname!=="/v1/jobs") return json({ok:false,error:"not-found"},404);
    if(!env.DB||!env.MEDIA) return json({ok:false,error:"bindings-unavailable"},503);
    let body;try{body=await request.json();}catch{return json({ok:false,error:"invalid-json"},400);}
    const id=String(body.id||"").trim(); if(!id) return json({ok:false,error:"id-required"},400);
    const row=await env.DB.prepare(
      "SELECT d.id,d.file_id,d.source_revision,d.derivative_type,d.status,f.object_key,f.original_name,f.extension " +
      "FROM portal_design_derivatives d JOIN portal_vault_files f ON f.id=d.file_id WHERE d.id=? LIMIT 1"
    ).bind(id).first();
    if(!row) return json({ok:false,error:"job-not-found"},404);
    if(row.status==="ready") return json({ok:true,status:"ready"});
    await env.DB.prepare("UPDATE portal_design_derivatives SET status='processing',engine='core-converter',error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
    try{
      if(row.derivative_type!=="preview-svg"||String(row.extension||"").toLowerCase()!=="kicad_pcb"){
        throw new Error("This converter version supports preview-svg for .kicad_pcb only.");
      }
      const object=await env.MEDIA.get(String(row.object_key));
      if(!object) throw new Error("Vault source object not found.");
      if(Number(object.size||0)>12*1024*1024) throw new Error("KiCad server preview is limited to 12 MB.");
      const source=await new Response(object.body).text();
      const svg=edgeSvg(parseEdges(source),String(row.original_name||"KiCad PCB"));
      const key="portal/vault/"+row.file_id+"/derivatives/r"+row.source_revision+"/"+id+".svg";
      await env.MEDIA.put(key,svg,{httpMetadata:{contentType:"image/svg+xml; charset=utf-8"}});
      await env.DB.prepare("UPDATE portal_design_derivatives SET status='ready',object_key=?,engine='core-converter-kicad-svg-v1',error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(key,id).run();
      return json({ok:true,status:"ready",objectKey:key});
    }catch(error){
      const message=error instanceof Error?error.message:String(error);
      await env.DB.prepare("UPDATE portal_design_derivatives SET status='failed',error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(message.slice(0,1000),id).run();
      return json({ok:false,status:"failed",error:message},422);
    }
  }
};