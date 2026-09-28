function extractSegments(source: string) {
  const segments: Array<{x1:number;y1:number;x2:number;y2:number;width:number;layer:string}> = [];
  const regex = /\(segment[\s\S]*?\(start\s+([\-\d.]+)\s+([\-\d.]+)\)[\s\S]*?\(end\s+([\-\d.]+)\s+([\-\d.]+)\)[\s\S]*?\(width\s+([\-\d.]+)\)[\s\S]*?\(layer\s+"?([^"\s\)]+)"?\)[\s\S]*?\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) && segments.length < 8000) {
    segments.push({
      x1:Number(match[1]), y1:Number(match[2]), x2:Number(match[3]), y2:Number(match[4]),
      width:Number(match[5]) || .25, layer:match[6],
    });
  }
  return segments;
}

export default function KiCadPcbPreview({ source }: { source: string }) {
  const segments = extractSegments(source);
  if (!segments.length) {
    return <div className="portalPreviewNotice"><b>KiCad PCB dosyası saklandı.</b><span>Bu dosyada çizilebilir segment bulunamadı; kaynak görünümü aşağıda kullanılabilir.</span></div>;
  }

  const xs = segments.flatMap((s) => [s.x1,s.x2]);
  const ys = segments.flatMap((s) => [s.y1,s.y2]);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
  const pad=6, width=Math.max(maxX-minX,1), height=Math.max(maxY-minY,1);

  return (
    <div className="portalPcbPreview">
      <svg viewBox={`${minX-pad} ${minY-pad} ${width+pad*2} ${height+pad*2}`} role="img" aria-label="KiCad PCB önizleme">
        <rect x={minX-pad} y={minY-pad} width={width+pad*2} height={height+pad*2} />
        {segments.map((s,index) => (
          <line
            key={index}
            x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            strokeWidth={Math.max(s.width,.15)}
            className={s.layer.toLowerCase().includes("b.cu") ? "back" : "front"}
          />
        ))}
      </svg>
      <span>{segments.length.toLocaleString("tr-TR")} iz segmenti · kaynak dosyadan canlı üretildi</span>
    </div>
  );
}
