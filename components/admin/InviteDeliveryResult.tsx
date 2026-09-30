"use client";

import type { InviteAdminState } from "@/app/admin/portal-actions";

export default function InviteDeliveryResult({ state }: { state: InviteAdminState }) {
  if (!state.deliveryStatus) return null;
  const sent=state.deliveryStatus==="sent";
  return <div className={"adminInviteDeliveryNotice "+state.deliveryStatus} role="status">
    <b>{sent?"Davet sağlayıcıya verildi":state.deliveryStatus==="pending"?"Gönderim sonucu doğrulanamadı":state.deliveryStatus==="not_configured"?"E-posta servisi hazır değil":"Davet maili gönderilemedi"}</b>
    <p>{state.email}</p>
    <p>{sent?"Alıcının sunucusuna teslim edildiği henüz doğrulanmadı. Mail ulaşmazsa aşağıdaki takip numarasını sağlayıcının gönderim günlüğünde ara.":"Davet kaydı oluşturuldu. Gönderim sonucunu kontrol etmeden art arda yeni davet üretme."}</p>
    {state.deliveryProvider?<small>Sağlayıcı: {state.deliveryProvider}</small>:null}
    {state.deliveryMessageId?<label>Takip numarası<input readOnly value={state.deliveryMessageId} aria-label="Davet maili takip numarası" onFocus={event=>event.currentTarget.select()}/></label>:null}
    {state.deliveryError?<p className="error">{state.deliveryError}</p>:null}
    {state.deliveryWarning?<p className="error">{state.deliveryWarning}</p>:null}
    <small>Aktivasyon kodu yalnız alıcıya gönderilir. Yeni davet, önceki kodu geçersiz kılar.</small>
  </div>;
}
