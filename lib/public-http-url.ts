
export function assertPublicHttpUrl(input: string): URL {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    throw new Error("Invalid URL");
  }

  if (u.username || u.password) {
    throw new Error("URLs with embedded credentials are not allowed");
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }

  let h = u.hostname.toLowerCase();
  
  if (h.includes(":")) {
    throw new Error("IPv6 literals are not allowed");
  }

  const blockedHosts = new Set([
    "localhost",
    "0.0.0.0",
    "127.0.0.1",
    "metadata.google.internal",
    "metadata",
    "::1",
    "[::1]"
  ]);
  if (blockedHosts.has(h) || h.endsWith(".localhost") || h.endsWith(".internal")) {
    throw new Error("That host cannot be fetched from Super Nova");
  }

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u.exec(h);
  if (v4) {
    const o = v4.slice(1, 5).map((x) => Number(x));
    if (o.some((n) => n > 255)) throw new Error("Invalid IPv4 address");
    const [a, b] = [o[0]!, o[1]!];
    if (a === 10) throw new Error("Private network ranges are blocked");
    if (a === 127) throw new Error("Loopback addresses are blocked");
    if (a === 0) throw new Error("Reserved addresses are blocked");
    if (a === 169 && b === 254) throw new Error("Link-local addresses are blocked");
    if (a === 192 && b === 168) throw new Error("Private network ranges are blocked");
    if (a === 172 && b >= 16 && b <= 31) throw new Error("Private network ranges are blocked");
  }

  return u;
}

