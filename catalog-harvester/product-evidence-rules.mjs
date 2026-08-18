export function sourceForBrand(brand, config) {
  return config?.sources?.find((item) => String(item.brand).toLocaleLowerCase() === String(brand).toLocaleLowerCase()) ?? null;
}

export function isOfficialEvidenceUrl(brand, rawUrl, config) {
  const source = sourceForBrand(brand, config);
  if (!source || !Array.isArray(source.officialHosts)) return false;
  let url;
  try { url = new URL(rawUrl); } catch { return false; }
  if (url.protocol !== 'https:') return false;
  return source.officialHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

export function normalizeExplicitFrameMaterial(value) {
  const text = String(value ?? '');
  if (/\bcarbon\b|\bfact\s*\d+r\b/i.test(text)) return 'Carbon';
  if (/\bal(?:uminium|uminum)?\s*\d{3,4}\b|\baluminium\b|\baluminum\b|\balloy\b/i.test(text)) return 'Aluminum';
  if (/\btitanium\b|\b\d?al\s*\/\s*\d(?:\.\d+)?v\b/i.test(text)) return 'Titanium';
  if (/\bchromoly\b|\bcr-?mo\b|\bsteel\b/i.test(text)) return 'Steel';
  return undefined;
}
