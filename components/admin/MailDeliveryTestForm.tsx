"use client";

import { useActionState } from "react";
import {
  sendPortalMailTestAdminAction,
  type MailTestAdminState,
} from "@/app/admin/portal-actions";

const initialState: MailTestAdminState = {};

export default function MailDeliveryTestForm() {
  const [state, action, pending] = useActionState(
    sendPortalMailTestAdminAction,
    initialState
  );

  return (
    <div className="adminMailTest">
      <form action={action}>
        <label>
          <span>Test alıcısı</span>
          <input
            type="email"
            name="recipient"
            placeholder="ornek@std.yildiz.edu.tr"
            required
          />
        </label>
        <button type="submit" disabled={pending}>
          {pending ? "GÖNDERİLİYOR..." : "TEST MAİLİ GÖNDER →"}
        </button>
      </form>

      {state.status ? (
        <div className={"adminMailTestResult " + state.status}>
          <b>
            {state.status === "sent"
              ? "TEST MAİLİ GÖNDERİLDİ"
              : state.status === "not_configured"
                ? "MAIL SERVİSİ HAZIR DEĞİL"
                : "GÖNDERİM HATASI"}
          </b>
          <span>
            {state.recipient || "—"}
            {state.provider ? " · " + state.provider : ""}
          </span>
          {state.messageId ? <small>Message ID: {state.messageId}</small> : null}
          {state.error ? <small>{state.error}</small> : null}
        </div>
      ) : state.error ? (
        <div className="adminMailTestResult failed"><small>{state.error}</small></div>
      ) : null}
    </div>
  );
}
