self.onmessage=(event)=>{
  try{
    const source=String(event.data?.source||"");
    const n=(value)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;};
    const edges=[],footprints=[],tracks=[],vias=[],netNames=[];

    for(const match of source.matchAll(/\(net\s+(\d+)\s+"([^"]*)"/g)){
      netNames.push([Number(match[1]),match[2]||("NET-"+match[1])]);
      if(netNames.length>5000) break;
    }

    const lineRe=/\(gr_line[\s\S]{0,160}?\(start\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,160}?\(end\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,320}?\(layer\s+"Edge\.Cuts"\)/g;
    for(const match of source.matchAll(lineRe)){
      edges.push({a:{x:n(match[1]),y:n(match[2])},b:{x:n(match[3]),y:n(match[4])}});
      if(edges.length>=8000) break;
    }

    const rectRe=/\(gr_rect[\s\S]{0,160}?\(start\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,160}?\(end\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,320}?\(layer\s+"Edge\.Cuts"\)/g;
    for(const match of source.matchAll(rectRe)){
      const x1=n(match[1]),y1=n(match[2]),x2=n(match[3]),y2=n(match[4]);
      edges.push(
        {a:{x:x1,y:y1},b:{x:x2,y:y1}},
        {a:{x:x2,y:y1},b:{x:x2,y:y2}},
        {a:{x:x2,y:y2},b:{x:x1,y:y2}},
        {a:{x:x1,y:y2},b:{x:x1,y:y1}},
      );
      if(edges.length>=8000) break;
    }

    const segmentRe=/\(segment[\s\S]{0,120}?\(start\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,120}?\(end\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,120}?\(width\s+([-+\d.]+)\)[\s\S]{0,160}?\(layer\s+"([^"]+)"\)[\s\S]{0,160}?\(net\s+(\d+)\)/g;
    for(const match of source.matchAll(segmentRe)){
      tracks.push({a:{x:n(match[1]),y:n(match[2])},b:{x:n(match[3]),y:n(match[4])},width:n(match[5]),layer:match[6],net:Number(match[7])});
      if(tracks.length>=60000) break;
    }

    const viaRe=/\(via[\s\S]{0,120}?\(at\s+([-+\d.]+)\s+([-+\d.]+)\)[\s\S]{0,120}?\(size\s+([-+\d.]+)\)[\s\S]{0,300}?\(net\s+(\d+)\)/g;
    for(const match of source.matchAll(viaRe)){
      vias.push({at:{x:n(match[1]),y:n(match[2])},size:n(match[3]),net:Number(match[4])});
      if(vias.length>=20000) break;
    }

    const lines=source.split(/\r?\n/);
    for(let i=0;i<lines.length;i+=1){
      const start=lines[i].match(/^\s*\(footprint\s+"?([^"\s()]+)"?/);
      if(!start) continue;
      let side="front",at=null;
      for(let j=i;j<Math.min(lines.length,i+90);j+=1){
        const layer=lines[j].match(/\(layer\s+"([FB])\.(?:Cu|SilkS|Fab)"/);
        if(layer) side=layer[1]==="B"?"back":"front";
        const pos=lines[j].match(/\(at\s+([-+\d.]+)\s+([-+\d.]+)/);
        if(pos&&!at) at={x:n(pos[1]),y:n(pos[2])};
        if(at&&layer) break;
      }
      if(at) footprints.push({name:start[1],at,side});
      if(footprints.length>=4000) break;
    }

    self.postMessage({ok:true,board:{edges,footprints,tracks,vias,netNames}});
  }catch(error){
    self.postMessage({ok:false,error:error instanceof Error?error.message:String(error)});
  }
};