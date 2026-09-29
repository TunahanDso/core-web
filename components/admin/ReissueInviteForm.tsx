"use client";

import { useActionState } from "react";
import {
  reissuePortalInviteAdminAction,
  type InviteAdminState,
} from "@/app/admin/portal-actions";

const initialState: InviteAdminState = {};

export default function ReissueInviteForm({ memberId }: { memberId: string }) {
  const [state, action, pending] = useActionState(
    reissuePortalInviteAdminAction,
    initialState
  );

  return (
    <div className="adminReissueInvite">
      <form action={action}>
        <input type="hidden" name="memberId" value={memberId} />
        <button type="submit" disabled={pending}>
          {pending ? "GÖNDERİLİYOR..." : "YENİ DAVET + GÖNDER"}
        </button>
      </form>
      {state.error ? <small className="error">{state.error}</small> : null}
      {state.deliveryStatus ? (
        <div className={"adminReissueResult " + state.deliveryStatus}>
          <span>
            {state.deliveryStatus === "sent"
              ? "Sağlayıcı mesajı kabul etti · inbox teslimi ayrıca doğrulanmalı"
              : "Gönderim başarısız · kod admin arayüzünde gösterilmedi"}
          </span>
          {state.deliveryError ? <small>{state.deliveryError}</small> : null}
        </div>
      ) : null}
    </div>
  );
}
