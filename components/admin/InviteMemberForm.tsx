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
            <option value="member">Mühendis / Üye</option>
            <option value="lead">Program / Takım Lideri</option>
            <option value="admin">Portal Yöneticisi</option>
            <option value="alumni">Mezun</option>
            <option value="viewer">Görüntüleyici</option>
          </select>
        </label>
        <label><span>Başlangıç takımları</span><input name="teams" placeholder="MAR, SYS, EMB" /><small>V6 sonrası ayrıntılı takım rolü Control Plane'den atanır.</small></label>
        <button type="submit" disabled={pending}>
          {pending ? "OLUŞTURULUYOR..." : "DAVET OLUŞTUR →"}
        </button>
      </form>

      {state.error ? <div className="adminInviteError">{state.error}</div> : null}

      {state.deliveryStatus ? (
        <div className={"adminInviteResult " + state.deliveryStatus}>
          <span>
            {state.deliveryStatus === "sent"
              ? "SAĞLAYICI MESAJI KABUL ETTİ"
              : state.deliveryStatus === "not_configured"
                ? "DAVET OLUŞTU · E-POSTA SERVİSİ HAZIR DEĞİL"
                : "DAVET OLUŞTU · E-POSTA GÖNDERİLEMEDİ"}
          </span>
          <p>{state.email}</p>
          <small>
            {state.deliveryStatus === "sent"
              ? "Bu durum inbox teslimini garanti etmez. Davet kodu yalnız alıcının e-postasında gösterilir."
              : "Kod admin arayüzünde gösterilmez. E-posta altyapısını düzelttikten sonra daveti yeniden üret."}
            {state.deliveryProvider ? " · " + state.deliveryProvider : ""}
          </small>
          {state.deliveryError ? <em>{state.deliveryError}</em> : null}
        </div>
      ) : null}
    </div>
  );
}
