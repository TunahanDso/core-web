function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});}
function errorMessage(error){return error instanceof Error?error.message:String(error||"mail-send-failed");}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method==="GET"&&url.pathname==="/health"){
      return json({ok:true,service:"core-mail",authority:"transactional-outbound-only"});
    }
    if(request.method!=="POST"||url.pathname!=="/v1/send") return json({ok:false,error:"not-found"},404);
    if(!env.EMAIL||typeof env.EMAIL.send!=="function") return json({ok:false,error:"email-binding-unavailable"},503);
    let body; try{body=await request.json();}catch{return json({ok:false,error:"invalid-json"},400);}
    const to=String(body.to||"").trim(),subject=String(body.subject||"").slice(0,240);
    const text=String(body.text||""),html=String(body.html||"");
    const from=body.from,replyTo=String(body.replyTo||"").trim();
    if(!to||!subject||(!text&&!html)) return json({ok:false,error:"invalid-payload"},400);
    try{
      const result=await env.EMAIL.send({from,to,subject,text,html,replyTo:replyTo||undefined});
      const messageId=typeof result?.messageId==="string"?result.messageId.trim():"";
      return json({ok:true,provider:"cloudflare",status:messageId?"sent":"pending",messageId:messageId||null},messageId?200:202);
    }catch(error){
      const code=error&&typeof error==="object"&&typeof error.code==="string"?error.code:undefined;
      return json({ok:false,status:code?"failed":"pending",error:errorMessage(error),code},502);
    }
  }
};
