"use client";
import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes } from "react";

export default function PendingSubmitButton({children,pendingLabel="İşleniyor…",disabled,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{pendingLabel?:string}) {
  const {pending}=useFormStatus();
  return <button {...props} type="submit" disabled={disabled || pending} aria-busy={pending}>{pending?pendingLabel:children}</button>;
}
