import { sanitizeRumPath,validRumMetric } from "@/lib/platform/rum";

const ALLOWED=new Set(["LCP","CLS","INP","TTFB"]);
const SURFACES=new Set(["portal","admin","public"]);

export async function POST(request:Request){
  let body:Record<string,unknown>;
  try{
    body=await request.json() as Record<string,unknown>;
  }catch{
    return new Response(null,{status:204});
  }

  const name=String(body.name||"");
  const surface=String(body.surface||"");
  const value=Number(body.value);
  const path=sanitizeRumPath(String(body.path||""));

  if(!ALLOWED.has(name)||!SURFACES.has(surface)||!validRumMetric(name,value)){
    return new Response(null,{status:204});
  }

  console.log(JSON.stringify({
    event:"core.rum",
    metric:name,
    value,
    surface,
    path,
  }));
  return new Response(null,{status:204,headers:{"Cache-Control":"no-store"}});
}
