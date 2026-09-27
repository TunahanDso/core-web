import { env } from "cloudflare:workers";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { headers } from "next/headers";

export type AdminIdentity =
  | {
      configured: false;
      authenticated: false;
      email: null;
      reason: "missing-config";
    }
  | {
      configured: true;
      authenticated: false;
      email: null;
      reason: "missing-token" | "invalid-token";
    }
  | {
      configured: true;
      authenticated: true;
      email: string | null;
      reason: null;
      payload: JWTPayload;
    };

function accessConfig() {
  const audience = env.POLICY_AUD;
  const teamDomain = env.TEAM_DOMAIN;

  if (
    typeof audience !== "string" ||
    !audience ||
    typeof teamDomain !== "string" ||
    !teamDomain
  ) {
    return null;
  }

  return {
    audience,
    teamDomain: teamDomain.replace(/\/$/, ""),
  };
}

export async function getAdminIdentity(): Promise<AdminIdentity> {
  const config = accessConfig();

  if (!config) {
    return {
      configured: false,
      authenticated: false,
      email: null,
      reason: "missing-config",
    };
  }

  const requestHeaders = await headers();
  const token = requestHeaders.get("cf-access-jwt-assertion");

  if (!token) {
    return {
      configured: true,
      authenticated: false,
      email: null,
      reason: "missing-token",
    };
  }

  try {
    const JWKS = createRemoteJWKSet(
      new URL(`${config.teamDomain}/cdn-cgi/access/certs`)
    );

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: config.teamDomain,
      audience: config.audience,
    });

    return {
      configured: true,
      authenticated: true,
      email: typeof payload.email === "string" ? payload.email : null,
      reason: null,
      payload,
    };
  } catch {
    return {
      configured: true,
      authenticated: false,
      email: null,
      reason: "invalid-token",
    };
  }
}

export async function requireAdminIdentity() {
  const identity = await getAdminIdentity();

  if (!identity.authenticated) {
    throw new Error("Verified Cloudflare Access identity required.");
  }

  return identity;
}
