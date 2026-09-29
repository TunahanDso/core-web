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
  const path=String(body.path||"").split("?")[0].slice(0,160);

  if(!ALLOWED.has(name)||!SURFACES.has(surface)||!Number.isFinite(value)||value<0||value>120000){
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
