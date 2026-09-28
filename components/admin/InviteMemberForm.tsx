"use client";

import { useActionState } from "react";
import {
  createPortalInviteAdminAction,
  type InviteAdminState,
} from "@/app/admin/portal-actions";

const initialState: InviteAdminState = {};

export default function InviteMemberForm() {
  const [state, action, pending] = useActionState(
    createPortalInviteAdminAction,
    initialState
  );

  return (
    <div className="adminInviteBlock">
      <form className="adminLightForm" action={action}>
        <label><span>Öğrenci adı soyadı</span><input name="fullName" required /></label>
        <label><span>Yıldız öğrenci e-postası</span><input name="email" type="email" placeholder="name@std.yildiz.edu.tr" required /></label>
        <label>
          <span>Portal rolü</span>
          <select name="role" defaultValue="member">
            <option value="member">Üye</option>
            <option value="lead">Takım lideri</option>
            <option value="admin">Portal yöneticisi</option>
            <option value="alumni">Mezun</option>
            <option value="viewer">Görüntüleyici</option>
          </select>
        </label>
        <label><span>Takımlar</span><input name="teams" placeholder="MAR, SYS, EMB" /></label>
        <button type="submit" disabled={pending}>
          {pending ? "OLUŞTURULUYOR..." : "DAVET OLUŞTUR →"}
        </button>
      </form>

      {state.error ? <div className="adminInviteError">{state.error}</div> : null}

      {state.code ? (
        <div className={"adminInviteResult " + (state.deliveryStatus || "")}>
          <span>
            {state.deliveryStatus === "sent"
              ? "DAVET E-POSTASI GÖNDERİLDİ"
              : state.deliveryStatus === "not_configured"
                ? "DAVET OLUŞTU · E-POSTA SERVİSİ HAZIR DEĞİL"
                : state.deliveryStatus === "failed"
                  ? "DAVET OLUŞTU · E-POSTA GÖNDERİLEMEDİ"
                  : "BU KODU YALNIZCA BİR KEZ GÖSTER"}
          </span>
          <b>{state.code}</b>
          <p>{state.email}</p>
          <small>
            Son geçerlilik: {state.expiresAt}
            {state.deliveryProvider ? " · " + state.deliveryProvider : ""}
          </small>
          {state.deliveryError ? <em>{state.deliveryError}</em> : null}
        </div>
      ) : null}
    </div>
  );
}
