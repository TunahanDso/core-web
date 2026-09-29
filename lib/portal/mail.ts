import { env } from "cloudflare:workers";

export type PortalMailDelivery = {
  provider: "cloudflare" | "resend" | "none";
  status: "sent" | "failed" | "not_configured";
  messageId?: string;
  error?: string;
};

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
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

function cloudflareFrom() {
  const value = mailFrom().trim();
  const match = value.match(/^(.+?)\s*<([^<>]+)>$/);
  if (!match) return value;
  const name = match[1].trim().replace(/^["']|["']$/g, "");
  const email = match[2].trim();
  return name ? { email, name } : email;
}

function mailReplyTo() {
  return typeof env.PORTAL_MAIL_REPLY_TO === "string" && env.PORTAL_MAIL_REPLY_TO
    ? env.PORTAL_MAIL_REPLY_TO
    : "portal@ytucore.com";
}

function formatExpiry(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Istanbul",
    }).format(date);
  } catch {
    return value;
  }
}

function cloudflareErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return error instanceof Error ? error.message : "Cloudflare Email gönderimi başarısız.";
  }
  const record = error as { code?: string; message?: string };
  const code = record.code || "";
  const message = record.message || "Cloudflare Email gönderimi başarısız.";

  if (code === "E_SENDER_NOT_VERIFIED" || code === "E_SENDER_DOMAIN_NOT_AVAILABLE") {
    return "ytucore.com gönderici domaini Cloudflare Email Service üzerinde henüz doğrulanmamış/onboard edilmemiş.";
  }
  if (code === "E_RECIPIENT_NOT_ALLOWED") {
    return "Cloudflare Email binding bu alıcıya gönderime izin vermiyor.";
  }
  if (code === "E_RATE_LIMIT_EXCEEDED" || code === "E_DAILY_LIMIT_EXCEEDED") {
    return "Cloudflare Email gönderim limiti doldu. Daha sonra tekrar deneyin.";
  }
  if (code === "E_RECIPIENT_SUPPRESSED") {
    return "Alıcı adresi önceki bounce/şikâyet nedeniyle suppression listesinde.";
  }
  return code ? code + ": " + message : message;
}

async function sendWithResend(payload: MailPayload): Promise<PortalMailDelivery> {
  if (typeof env.RESEND_API_KEY !== "string" || !env.RESEND_API_KEY) {
    return {
      provider: "none",
      status: "not_configured",
      error: "İkincil Resend sağlayıcısı yapılandırılmadı.",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + env.RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: mailFrom(),
        to: [payload.to],
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        reply_to: mailReplyTo(),
      }),
    });
    const result = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      return {
        provider: "resend",
        status: "failed",
        error: typeof result.message === "string" ? result.message : "Resend gönderimi başarısız.",
      };
    }
    return {
      provider: "resend",
      status: "sent",
      messageId: typeof result.id === "string" ? result.id : undefined,
    };
  } catch (error) {
    return {
      provider: "resend",
      status: "failed",
      error: error instanceof Error ? error.message : "Resend gönderimi başarısız.",
    };
  }
}

async function sendWithMailService(payload:MailPayload):Promise<PortalMailDelivery | null>{
  const binding=(env as unknown as Record<string,unknown>).MAIL_SERVICE as { fetch?: typeof fetch } | undefined;
  if(!binding || typeof binding.fetch!=="function") return null;
  try{
    const response=await binding.fetch("https://core-mail.internal/v1/send",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        ...payload,
        from:cloudflareFrom(),
        replyTo:mailReplyTo(),
      }),
    });
    const result=await response.json().catch(()=>({})) as {ok?:boolean;provider?:string;messageId?:string;error?:string};
    if(response.ok&&result.ok){
      return {provider:"cloudflare",status:"sent",messageId:result.messageId};
    }
    return {provider:"cloudflare",status:"failed",error:result.error||"CORE Mail Service gönderimi başarısız."};
  }catch(error){
    return {provider:"cloudflare",status:"failed",error:error instanceof Error?error.message:"CORE Mail Service erişilemedi."};
  }
}

async function deliverPortalEmail(payload: MailPayload): Promise<PortalMailDelivery> {
  const isolated=await sendWithMailService(payload);
  if(isolated?.status==="sent") return isolated;

  let cloudflareFailure: string | undefined = isolated?.error;

  if (env.EMAIL && typeof env.EMAIL.send === "function") {
    try {
      const result = await env.EMAIL.send({
        from: cloudflareFrom(),
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        replyTo: mailReplyTo(),
      });
      return {
        provider: "cloudflare",
        status: "sent",
        messageId: result?.messageId,
      };
    } catch (error) {
      cloudflareFailure = cloudflareErrorMessage(error);
    }
  }

  if (typeof env.RESEND_API_KEY === "string" && env.RESEND_API_KEY) {
    const fallback = await sendWithResend(payload);
    if (fallback.status === "sent") return fallback;
    return {
      ...fallback,
      error: [cloudflareFailure, fallback.error].filter(Boolean).join(" · "),
    };
  }

  if (cloudflareFailure) {
    return {
      provider: "cloudflare",
      status: "failed",
      error: cloudflareFailure,
    };
  }

  return {
    provider: "none",
    status: "not_configured",
    error: "E-posta sağlayıcısı henüz yapılandırılmadı.",
  };
}

function invitationTemplate(input: {
  to: string;
  fullName: string;
  code: string;
  expiresAt: string;
}) {
  const activationUrl =
    portalBaseUrl() + "/portal/activate?email=" + encodeURIComponent(input.to);
  const safeName = escapeHtml(input.fullName || input.to);
  const safeEmail = escapeHtml(input.to);
  const safeCode = escapeHtml(input.code);
  const safeExpiry = escapeHtml(formatExpiry(input.expiresAt));
  const safeActivationUrl = escapeHtml(activationUrl);
  const subject = "YTÜ CORE Portal üyelik daveti";

  const text = [
    "Merhaba " + (input.fullName || input.to) + ",",
    "",
    "YTÜ CORE iç portal hesabın hazır.",
    "",
    "Aktivasyon: " + activationUrl,
    "Öğrenci e-postan: " + input.to,
    "Tek kullanımlık davet kodun: " + input.code,
    "Son geçerlilik: " + formatExpiry(input.expiresAt) + " (İstanbul)",
    "",
    "Kod yalnızca bu öğrenci e-posta adresiyle çalışır, bir kez kullanılabilir ve 72 saat sonra sona erer.",
    "Bu daveti sen beklemiyorsan herhangi bir işlem yapmana gerek yok.",
    "",
    "YTÜ CORE",
    "İnsan İçin Teknoloji.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="tr">
<body style="margin:0;padding:0;background:#f0f2ed;color:#17191d;font-family:Inter,Arial,Helvetica,sans-serif">\n  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">YTÜ CORE Portal hesabını 72 saat içinde tek kullanımlık davet kodunla aktifleştir.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f2ed;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dde0da;border-radius:18px;overflow:hidden">
        <tr>
          <td style="background:#17191d;padding:22px 28px">
            <div style="font:800 11px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;color:#ff6500">YTÜ CORE · ÜYE PORTALI</div>
            <div style="margin-top:8px;color:#aeb4b9;font-size:12px">Yıldız Teknik Üniversitesi · öğrenci mühendislik çalışma alanı</div>
          </td>
        </tr>
        <tr>
          <td style="padding:34px 28px 14px">
            <div style="font-size:13px;color:#747c82">Merhaba <strong style="color:#17191d">${safeName}</strong>,</div>
            <h1 style="margin:12px 0 14px;font-size:36px;line-height:1.05;letter-spacing:-1.4px">CORE hesabın hazır.</h1>
            <p style="margin:0;color:#667078;font-size:15px;line-height:1.7">Takım içi görevler, teknik dosyalar, Vault, Mail, envanter ve mühendislik çalışma alanına erişmek için hesabını aktifleştir.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f8f4;border:1px solid #e1e3de;border-radius:12px">
              <tr><td style="padding:18px 20px 8px;color:#8b9298;font:800 10px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em">ÖĞRENCİ E-POSTASI</td></tr>
              <tr><td style="padding:0 20px 18px;font-size:14px;font-weight:700">${safeEmail}</td></tr>
              <tr><td style="border-top:1px solid #e1e3de;padding:18px 20px 8px;color:#8b9298;font:800 10px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em">TEK KULLANIMLIK DAVET KODU</td></tr>
              <tr><td style="padding:0 20px 8px;color:#e65b00;font:900 22px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.07em">${safeCode}</td></tr>
              <tr><td style="padding:0 20px 18px;color:#8a9197;font-size:11px">Son geçerlilik: ${safeExpiry} · İstanbul</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:4px 28px 18px">
            <a href="${safeActivationUrl}" style="display:block;text-align:center;background:#ff6500;color:#111111;text-decoration:none;font-weight:900;font-size:13px;letter-spacing:.03em;padding:16px 18px;border-radius:9px">CORE hesabımı aktifleştir →</a>\n            <p style="margin:14px 0 0;color:#8a9197;font-size:11px;line-height:1.6">Buton açılmazsa bu bağlantıyı tarayıcıya yapıştır:<br /><a href="${safeActivationUrl}" style="color:#c84c00;word-break:break-all">${safeActivationUrl}</a></p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 30px">
            <div style="padding:16px 18px;border-left:3px solid #ff6500;background:#fff8f1;color:#6f7478;font-size:12px;line-height:1.65">
              Kod yalnızca <strong>${safeEmail}</strong> adresiyle çalışır, bir kez kullanılabilir ve 72 saat sonra sona erer. Bu daveti sen beklemiyorsan herhangi bir işlem yapmana gerek yok.
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px;border-top:1px solid #eceee9;color:#8a9197;font-size:11px;line-height:1.6">
            <strong style="color:#17191d">YTÜ CORE</strong> · İnsan İçin Teknoloji.<br />
            Bu ileti yalnızca davet edildiğin CORE Portal hesabının aktivasyonu için gönderildi; reklam veya toplu pazarlama iletisi değildir.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { to: input.to, subject, text, html };
}

export async function sendPortalInvitationEmail(input: {
  to: string;
  fullName: string;
  code: string;
  expiresAt: string;
}): Promise<PortalMailDelivery> {
  return deliverPortalEmail(invitationTemplate(input));
}

export async function sendPortalTestEmail(input: {
  to: string;
  requestedBy: string;
}): Promise<PortalMailDelivery> {
  const safeTo = escapeHtml(input.to);
  const safeActor = escapeHtml(input.requestedBy);
  return deliverPortalEmail({
    to: input.to,
    subject: "YTÜ CORE Portal · E-posta servisi testi",
    text: [
      "YTÜ CORE Portal e-posta servisi çalışıyor.",
      "Alıcı: " + input.to,
      "Testi isteyen yönetici: " + input.requestedBy,
      "",
      "Bu mesajı görüyorsan davet e-postası altyapısı gönderim yapabiliyor.",
    ].join("\n"),
    html: `<div style="background:#f0f2ed;padding:28px;font-family:Arial,Helvetica,sans-serif;color:#17191d">
      <div style="max-width:600px;margin:auto;background:#fff;border:1px solid #dde0da;border-radius:16px;padding:28px">
        <div style="color:#ff6500;font:900 11px monospace;letter-spacing:.12em">YTÜ CORE · MAIL TEST</div>
        <h1 style="margin:14px 0 10px;font-size:30px">E-posta servisi çalışıyor.</h1>
        <p style="color:#687078;line-height:1.65">Bu mesajı görüyorsan CORE Portal transactional mail hattı gerçek teslimat yapabiliyor.</p>
        <div style="margin-top:22px;padding:14px;background:#17191d;color:#fff;border-radius:9px">
          <div style="color:#ff6500;font:800 10px monospace">ALICI</div>
          <div style="margin-top:5px">${safeTo}</div>
        </div>
        <p style="margin-top:20px;color:#90969c;font-size:11px">Testi isteyen yönetici: ${safeActor}</p>
      </div>
    </div>`,
  });
}

export function portalMailProviderStatus() {
  const cloudflare = Boolean(env.EMAIL && typeof env.EMAIL.send === "function");
  const resend = typeof env.RESEND_API_KEY === "string" && Boolean(env.RESEND_API_KEY);

  return {
    configured: cloudflare || resend,
    provider: cloudflare
      ? (resend ? "Cloudflare Email Service · Resend fallback" : "Cloudflare Email Service")
      : resend
        ? "Resend"
        : "Yapılandırılmadı",
    from: mailFrom(),
    replyTo: mailReplyTo(),
    cloudflare,
    resend,
  };
}
