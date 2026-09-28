type DnsJsonAnswer = {
  name?: string;
  type?: number;
  data?: string;
};

type DnsJsonResponse = {
  Status?: number;
  Answer?: DnsJsonAnswer[];
};

export type PortalMailDnsCheck = {
  key: "spf" | "dkim" | "dmarc";
  label: string;
  hostname: string;
  status: "pass" | "warn" | "fail";
  summary: string;
  values: string[];
};

export type PortalMailDnsHealth = {
  checkedAt: string;
  checks: PortalMailDnsCheck[];
  healthy: boolean;
  error?: string;
};

function normalizeTxt(value: string) {
  return value
    .replace(/^"+|"+$/g, "")
    .replace(/"\s+"/g, "")
    .trim();
}

async function queryTxt(hostname: string): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const url =
      "https://cloudflare-dns.com/dns-query?name=" +
      encodeURIComponent(hostname) +
      "&type=TXT";
    const response = await fetch(url, {
      headers: { Accept: "application/dns-json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("DNS sorgusu HTTP " + response.status + " döndürdü.");
    const body = await response.json() as DnsJsonResponse;
    return (body.Answer || [])
      .map((answer) => normalizeTxt(String(answer.data || "")))
      .filter(Boolean);
  } finally {
    clearTimeout(timer);
  }
}

export async function getPortalMailDnsHealth(): Promise<PortalMailDnsHealth> {
  const checkedAt = new Date().toISOString();
  try {
    const [spfValues, dkimValues, dmarcValues] = await Promise.all([
      queryTxt("cf-bounce.ytucore.com"),
      queryTxt("cf-bounce._domainkey.ytucore.com"),
      queryTxt("_dmarc.ytucore.com"),
    ]);

    const spfPass = spfValues.some((value) =>
      value.toLowerCase().includes("v=spf1") &&
      value.toLowerCase().includes("include:_spf.mx.cloudflare.net")
    );
    const dkimPass = dkimValues.some((value) =>
      value.toLowerCase().includes("v=dkim1") &&
      value.toLowerCase().includes("p=")
    );
    const dmarcRecord = dmarcValues.find((value) =>
      value.toLowerCase().includes("v=dmarc1")
    );
    const dmarcPass = Boolean(dmarcRecord);

    const checks: PortalMailDnsCheck[] = [
      {
        key: "spf",
        label: "SPF",
        hostname: "cf-bounce.ytucore.com",
        status: spfPass ? "pass" : "fail",
        summary: spfPass
          ? "Cloudflare Email Sending SPF kaydı görünüyor."
          : "Email Sending SPF kaydı bulunamadı veya Cloudflare include değeri eksik.",
        values: spfValues,
      },
      {
        key: "dkim",
        label: "DKIM",
        hostname: "cf-bounce._domainkey.ytucore.com",
        status: dkimPass ? "pass" : "fail",
        summary: dkimPass
          ? "Cloudflare Email Sending DKIM public key kaydı görünüyor."
          : "Cloudflare Email Sending DKIM selector kaydı bulunamadı.",
        values: dkimValues,
      },
      {
        key: "dmarc",
        label: "DMARC",
        hostname: "_dmarc.ytucore.com",
        status: dmarcPass ? "pass" : "warn",
        summary: dmarcPass
          ? "DMARC politikası yayınlanıyor."
          : "DMARC kaydı bulunamadı. Teslimat çalışabilir fakat domain güven sinyali eksik kalır.",
        values: dmarcValues,
      },
    ];

    return {
      checkedAt,
      checks,
      healthy: spfPass && dkimPass && dmarcPass,
    };
  } catch (error) {
    return {
      checkedAt,
      checks: [],
      healthy: false,
      error: error instanceof Error ? error.message : "DNS sağlık kontrolü çalıştırılamadı.",
    };
  }
}
