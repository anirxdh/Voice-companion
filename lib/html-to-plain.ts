/** Very small HTML → readable text for fallback browse (no Firecrawl). */
export function htmlToPlainDocument(html: string, maxChars = 12000): string {
  const noScripts = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/giu, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/giu, " ")
    .replace(/<!--([\s\S]*?)-->/gu, " ");

  const rough = noScripts
    .replace(/<\/(p|div|br|li|h1|h2|h3|h4|tr)\b[^>]*>/giu, "\n")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\u00a0/gu, " ")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .replace(/[ \t]{2,}/gu, " ")
    .trim();

  return rough.length > maxChars ? `${rough.slice(0, maxChars).trim()}…` : rough;
}
