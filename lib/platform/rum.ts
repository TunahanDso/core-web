export type RumMetricName="LCP"|"CLS"|"INP"|"TTFB";
export type RumSurface="portal"|"admin"|"public";

const UUIDISH=/^[0-9a-f]{8,}(?:-[0-9a-f]{4,}){2,}$/i;
const LONG_TOKEN=/^[A-Za-z0-9_-]{24,}$/;

export function rumSurfaceForPath(path:string):RumSurface{
  if(path.startsWith("/portal")) return "portal";
  if(path.startsWith("/admin")) return "admin";
  return "public";
}

export function sanitizeRumPath(input:string){
  const path=String(input||"/").split("?")[0].slice(0,240);
  const segments=path.split("/").map((segment)=>{
    if(UUIDISH.test(segment)||LONG_TOKEN.test(segment)) return ":id";
    return segment.slice(0,64);
  });
  return segments.join("/").slice(0,160)||"/";
}

export function validRumMetric(name:string,value:number){
  return ["LCP","CLS","INP","TTFB"].includes(name)&&Number.isFinite(value)&&value>=0&&value<=120000;
}
