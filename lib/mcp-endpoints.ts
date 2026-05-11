/** Central place for MCP HTTP URLs: semantic env vars + legacy `NEXT_PUBLIC_MCP_ENDPOINT_1/2`. */

const DEFAULT_ENDPOINTS = [
  "https://still-thunder-8btdl.run.mcp-use.com/mcp",
  "https://young-surf-xt5j8.run.mcp-use.com/mcp",
  "https://summer-poetry-bwin6.run.mcp-use.com/mcp"
] as const;

function trimUrl(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v || undefined;
}

function readHyphenYtVideo(): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const dashKey = process.env["NEXT_PUBLIC_MCP_ENDPOINT_YT-VIDEO"];
  const underscored = process.env.NEXT_PUBLIC_MCP_ENDPOINT_YT_VIDEO;
  return trimUrl(dashKey) ?? trimUrl(underscored);
}

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const n = u.trim();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/** All MCP base URLs used by `connectToMCPServers` (NEXT_PUBLIC_*). */
export function getMcpDiscoverUrls(): string[] {
  if (typeof process === "undefined" || !process.env) {
    return [...DEFAULT_ENDPOINTS];
  }

  const fromSemantic = dedupeUrls(
    [
      trimUrl(process.env.NEXT_PUBLIC_MCP_ENDPOINT_MESSAGE),
      trimUrl(process.env.NEXT_PUBLIC_MCP_ENDPOINT_MUSIC),
      trimUrl(readHyphenYtVideo()),
      trimUrl(process.env.NEXT_PUBLIC_MCP_ENDPOINT_YOUTUBE_VIDEO),
      trimUrl(process.env.NEXT_PUBLIC_MCP_ENDPOINT_YOUTUBE)
    ].filter(Boolean) as string[]
  );

  const legacy = dedupeUrls(
    [
      trimUrl(process.env.NEXT_PUBLIC_MCP_ENDPOINT_1),
      trimUrl(process.env.NEXT_PUBLIC_MCP_ENDPOINT_2)
    ].filter(Boolean) as string[]
  );

  const merged = dedupeUrls([...fromSemantic, ...legacy]);
  return merged.length > 0 ? merged : [...DEFAULT_ENDPOINTS];
}

export function youtubeVideoMcpEndpoint(): string | undefined {
  return readHyphenYtVideo() ?? trimUrl(process.env.NEXT_PUBLIC_MCP_ENDPOINT_YOUTUBE_VIDEO) ?? trimUrl(process.env.NEXT_PUBLIC_MCP_ENDPOINT_YOUTUBE);
}

export function musicMcpEndpoint(): string | undefined {
  return trimUrl(process.env.NEXT_PUBLIC_MCP_ENDPOINT_MUSIC);
}

export function messageMcpEndpoint(): string | undefined {
  return trimUrl(process.env.NEXT_PUBLIC_MCP_ENDPOINT_MESSAGE);
}

export function urlsMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return a.trim() === b.trim();
}
