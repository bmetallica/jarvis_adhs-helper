// HMAC-signierte Session-Tokens (aus serve.js extrahiert, damit sie testbar sind).
import crypto from "node:crypto";

export function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

/** Token mit Ablaufzeit erzeugen: `<b64url(exp)>.<b64url(hmac(exp))>`. */
export function makeToken(secret, ttlMs) {
  const exp = String(Date.now() + ttlMs);
  const sig = crypto.createHmac("sha256", secret).update(exp).digest();
  return `${b64url(exp)}.${b64url(sig)}`;
}

/** Signatur (timing-safe) und Ablaufzeit prüfen. */
export function verifyToken(secret, tok) {
  if (!tok || !tok.includes(".")) return false;
  const [p, s] = tok.split(".");
  let exp;
  try {
    exp = Buffer.from(p, "base64url").toString();
  } catch {
    return false;
  }
  const expect = crypto.createHmac("sha256", secret).update(exp).digest();
  let got;
  try {
    got = Buffer.from(s, "base64url");
  } catch {
    return false;
  }
  if (got.length !== expect.length || !crypto.timingSafeEqual(got, expect)) return false;
  return Number(exp) > Date.now();
}
