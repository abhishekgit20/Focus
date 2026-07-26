// Issues ICE server configs for client-side WebRTC calls. STUN alone lets
// most home-network peers connect directly; a TURN relay is what makes calls
// actually work behind symmetric NATs and locked-down corporate/hospital
// firewalls, which is common enough for this audience to matter. TURN
// credentials are short-lived (minted per request, not stored) since they're
// effectively bearer tokens for relaying traffic through the TURN provider.
import { getEnv } from "./env";

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

const GOOGLE_STUN: IceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
const TURN_CREDENTIAL_TTL_SECONDS = 3600;

export async function getIceServers(): Promise<IceServer[]> {
  const env = getEnv();
  const keyId = env.CLOUDFLARE_TURN_KEY_ID;
  const apiToken = env.CLOUDFLARE_TURN_API_TOKEN;

  if (!keyId || !apiToken) {
    // No TURN provider configured — STUN-only. Fine for same-network testing
    // and many real connections, but calls behind restrictive NATs will fail.
    return GOOGLE_STUN;
  }

  try {
    const resp = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: TURN_CREDENTIAL_TTL_SECONDS }),
      }
    );

    if (!resp.ok) {
      console.error(`Cloudflare TURN credential request failed: HTTP ${resp.status}`);
      return GOOGLE_STUN;
    }

    const data = await resp.json();
    const turnServer: IceServer | undefined = data?.iceServers;
    if (!turnServer) return GOOGLE_STUN;

    return [...GOOGLE_STUN, turnServer];
  } catch (error) {
    console.error("Failed to fetch Cloudflare TURN credentials:", error);
    return GOOGLE_STUN;
  }
}
