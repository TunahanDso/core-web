"use client";
import { useRouter } from "next/navigation";
export default function MailFolderSelect({folder,options}:{folder:string;options:{value:string;label:string}[]}) {
  const router=useRouter();
  return <label className="mailCompactFolderSelect"><span>Klasör</span><select aria-label="Yazışma klasörü" value={folder} onChange={event=>{
    const query=new URLSearchParams(window.location.search);
    query.set("folder",event.target.value);query.set("section","mail");
    for(const key of ["thread","compose","draft","reply","forward","group"])query.delete(key);
    router.push("/portal/mail?"+query.toString());
  }}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
