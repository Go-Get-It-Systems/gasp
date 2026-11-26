/** Translate saved Clearbit URLs without changing uploaded profile photos. */
export function resolveCompanyLogoUrl(uri: string | null): string | null {
  if (!uri) return uri;
  const legacy = uri.match(/^https?:\/\/logo\.clearbit\.com\/([a-z0-9.-]+)\/?(?:[?#].*)?$/i);
  if (!legacy) return uri;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(legacy[1].toLowerCase())}&sz=128`;
}
