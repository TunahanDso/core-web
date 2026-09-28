import { env } from "cloudflare:workers";

export type PortalMailDelivery = {
  provider: "cloudflare" | "resend" | "none";
  status: "sent" | "failed" | "not_configured";
  messageId?: string;
  error?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function portalBaseUrl() {
  return typeof env.PORTAL_BASE_URL === "string" && env.PORTAL_BASE_URL
    ? env.PORTAL_BASE_URL.replace(/\/+$/, "")
    : "https://ytucore.com";
}

function mailFrom() {
  return typeof env.PORTAL_MAIL_FROM === "string" && env.PORTAL_MAIL_FROM
    ? env.PORTAL_MAIL_FROM
    : "YTÜ CORE Portal <portal@ytucore.com>";
}

export async function sendPortalInvitationEmail(input: {
  to: string;
  fullName: string;
  code: string;
  expiresAt: string;
}): Promise<PortalMailDelivery> {
  const activationUrl = portalBaseUrl() + "/portal/activate";
  const safeName = escapeHtml(input.fullName || input.to);
  const safeCode = escapeHtml(input.code);
  const safeExpiry = escapeHtml(input.expiresAt);
  const subject = "YTÜ CORE Portal davetin";
  const text = [
    "Merhaba " + (input.fullName || input.to) + ",",
    "",
    "YTÜ CORE iç portal hesabın oluşturuldu.",
    "Aktivasyon adresi: " + activationUrl,
    "Tek kullanımlık davet kodun: " + input.code,
    "Son geçerlilik: " + input.expiresAt,
    "",
    "Bu kod yalnızca senin öğrenci e-posta adresinle kullanılabilir ve bir kez geçerlidir.",
    "YTÜ CORE · İnsan İçin Teknoloji.",
  ].join("\n");

  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f5f2;padding:32px;color:#17191d">',
    '<div style="max-width:620px;margin:auto;background:#ffffff;border:1px solid #dde0da;padding:32px">',
    '<div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#ff6500">YTÜ CORE · İÇ PORTAL</div>',
    '<h1 style="font-size:34px;line-height:1;margin:18px 0 12px">CORE hesabın hazır.</h1>',
    '<p style="color:#687078;line-height:1.65">Merhaba ' + safeName + ', öğrenci portalı hesabın içeriden oluşturuldu. Aşağıdaki tek kullanımlık kod ile hesabını aktifleştir.</p>',
    '<div style="margin:28px 0;padding:18px;background:#17191d;color:#ffffff">',
    '<div style="font-size:11px;color:#a4abb2">DAVET KODU</div>',
    '<div style="font-family:monospace;font-weight:800;font-size:22px;letter-spacing:.08em;color:#ff6500;margin-top:8px">' + safeCode + '</div>',
    '<div style="font-size:11px;color:#a4abb2;margin-top:10px">Son geçerlilik: ' + safeExpiry + '</div>',
    '</div>',
    '<a href="' + activationUrl + '" style="display:inline-block;background:#ff6500;color:#111111;text-decoration:none;font-weight:800;padding:13px 18px">HESABI AKTİFLEŞTİR →</a>',
    '<p style="margin-top:28px;color:#777f86;font-size:12px;line-height:1.6">Kod öğrenci e-posta adresine bağlıdır, yalnızca bir kez kullanılabilir ve 72 saat sonra sona erer.</p>',
    '<div style="margin-top:30px;padding-top:16px;border-top:1px solid #eceee9;font-size:11px;color:#90969c">YTÜ CORE · İnsan İçin Teknoloji.</div>',
    '</div></div>',
  ].join("");

  if (env.EMAIL && typeof env.EMAIL.send === "function") {
    try {
      const result = await env.EMAIL.send({ from: mailFrom(), to: input.to, subject, text, html });
      return { provider: "cloudflare", status: "sent", messageId: result?.messageId };
    } catch (error) {
      return {
        provider: "cloudflare",
        status: "failed",
        error: error instanceof Error ? error.message : "Cloudflare Email gönderimi başarısız.",
      };
    }
  }

  if (typeof env.RESEND_API_KEY === "string" && env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ from: mailFrom(), to: [input.to], subject, text, html }),
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) {
        return {
          provider: "resend",
          status: "failed",
          error: typeof payload.message === "string" ? payload.message : "Resend gönderimi başarısız.",
        };
      }
      return {
        provider: "resend",
        status: "sent",
        messageId: typeof payload.id === "string" ? payload.id : undefined,
      };
    } catch (error) {
      return {
        provider: "resend",
        status: "failed",
        error: error instanceof Error ? error.message : "Resend gönderimi başarısız.",
      };
    }
  }

  return {
    provider: "none",
    status: "not_configured",
    error: "E-posta sağlayıcısı henüz yapılandırılmadı.",
  };
}