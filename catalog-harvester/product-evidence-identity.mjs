function normalizeIdentity(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase()
    .replace(/[’'`]/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function expectedModelIdentity(entry) {
  const model = normalizeIdentity(entry?.model);
  const brand = normalizeIdentity(entry?.brand);
  const year = String(entry?.model_year ?? '').trim();
  return { model, brand, year };
}

function stripOuterIdentityTokens(value, brand, year) {
  let normalized = normalizeIdentity(value);
  const brandTokens = brand.split(' ').filter(Boolean);
  const stripBrand = () => {
    const tokens = normalized.split(' ').filter(Boolean);
    if (brandTokens.length > 0 && tokens.slice(0, brandTokens.length).join(' ') === brand) {
      normalized = tokens.slice(brandTokens.length).join(' ');
      return true;
    }
    if (brandTokens.length > 0 && tokens.slice(-brandTokens.length).join(' ') === brand) {
      normalized = tokens.slice(0, -brandTokens.length).join(' ');
      return true;
    }
    return false;
  };
  const stripYear = () => {
    const tokens = normalized.split(' ').filter(Boolean);
    if (year && tokens[0] === year) {
      normalized = tokens.slice(1).join(' ');
      return true;
    }
    if (year && tokens.at(-1) === year) {
      normalized = tokens.slice(0, -1).join(' ');
      return true;
    }
    return false;
  };
  let changed = true;
  while (changed) changed = stripBrand() || stripYear();
  return normalized;
}

function pageIdentitySegments(identity) {
  return String(identity ?? '')
    .split(/\s+[|•·–—-]\s+/u)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function modelMatchesPageIdentity(identity, expected) {
  return pageIdentitySegments(identity).some((segment) =>
    stripOuterIdentityTokens(segment, expected.brand, expected.year) === expected.model);
}

function explicitYears(values) {
  const years = [];
  for (const value of values) {
    for (const match of String(value ?? '').matchAll(/\b(20\d{2})\b/gu)) years.push(match[1]);
  }
  return years;
}

const isUrlPathIdentity = (value) => String(value ?? '').trim().startsWith('/');

function decodedPathSegments(pathValue) {
  return String(pathValue ?? '')
    .split('/')
    .map((segment) => {
      try { return decodeURIComponent(segment); } catch { return segment; }
    })
    .filter(Boolean);
}

function urlPathSegments(urlValue) {
  try { return decodedPathSegments(new URL(String(urlValue ?? '')).pathname); }
  catch { return []; }
}

function modelMatchesPathSegments(segments, expected) {
  return segments.some((segment) =>
    stripOuterIdentityTokens(segment, expected.brand, expected.year) === expected.model);
}

function modelMatchesUrlPath(urlValue, expected) {
  return modelMatchesPathSegments(urlPathSegments(urlValue), expected);
}

function modelMatchesPathIdentity(pathIdentity, expected) {
  return modelMatchesPathSegments(decodedPathSegments(pathIdentity), expected);
}

export function verifyProductYearEvidence(entry, evidence) {
  const expected = expectedModelIdentity(entry);
  if (!expected.model) return { valid: false, reason: 'expected model identity is missing' };
  if (!/^20\d{2}$/u.test(expected.year)) return { valid: false, reason: 'expected model year is missing or invalid' };

  const sourceUrl = String(evidence?.source_url ?? '').trim();
  const identity = String(evidence?.identity ?? '').trim();
  if (!sourceUrl || !identity) return { valid: false, reason: 'resolver model-year evidence is incomplete' };

  const identityYears = explicitYears([identity]);
  if (!identityYears.includes(expected.year) || identityYears.some((year) => year !== expected.year)) {
    return { valid: false, reason: `resolver identity does not confirm model year ${expected.year}` };
  }
  const sourceYears = explicitYears([sourceUrl]);
  if (sourceYears.some((year) => year !== expected.year)) {
    return { valid: false, reason: `resolver source URL conflicts with model year ${expected.year}` };
  }

  const modelMatched = modelMatchesPageIdentity(identity, expected)
    || modelMatchesUrlPath(identity, expected)
    || (isUrlPathIdentity(identity) && modelMatchesPathIdentity(identity, expected));
  if (!modelMatched) return { valid: false, reason: 'resolver identity does not confirm exact model identity' };

  return { valid: true, reason: null };
}

export function verifyProductIdentity(entry, parsed) {
  const expected = expectedModelIdentity(entry);
  if (!expected.model) return { valid: false, reason: 'expected model identity is missing' };
  if (!/^20\d{2}$/u.test(expected.year)) return { valid: false, reason: 'expected model year is missing or invalid' };

  const identities = Array.isArray(parsed?.identities)
    ? parsed.identities.map((value) => String(value ?? '').trim()).filter(Boolean)
    : [];
  const contentIdentities = identities.filter((identity) => !isUrlPathIdentity(identity));
  const pathIdentities = identities.filter(isUrlPathIdentity);
  const sourceUrl = parsed?.source_url ?? parsed?.sourceUrl ?? entry?.manufacturer_url ?? null;
  const contentYears = explicitYears(contentIdentities);
  const fallbackYears = explicitYears([...pathIdentities, sourceUrl]);

  if (contentYears.some((year) => year !== expected.year)) {
    return { valid: false, reason: `official page model year does not match ${expected.year}` };
  }
  if (contentYears.length === 0 && fallbackYears.some((year) => year !== expected.year)) {
    return { valid: false, reason: `official URL model year does not match ${expected.year}` };
  }

  if (contentIdentities.length > 0) {
    if (!contentIdentities.some((identity) => modelMatchesPageIdentity(identity, expected))) {
      return { valid: false, reason: 'official page does not confirm exact model identity' };
    }
  } else {
    const pathMatched = pathIdentities.some((identity) => modelMatchesPathIdentity(identity, expected));
    if (!pathMatched && !modelMatchesUrlPath(sourceUrl, expected)) {
      return { valid: false, reason: 'official URL does not confirm exact model identity' };
    }
  }

  if (!contentYears.includes(expected.year) && !fallbackYears.includes(expected.year)) {
    const resolverYearEvidence = verifyProductYearEvidence(entry, parsed?.model_year_evidence);
    if (!resolverYearEvidence.valid) {
      return {
        valid: false,
        reason: `official evidence does not confirm model year ${expected.year}: ${resolverYearEvidence.reason}`,
      };
    }
  }

  return { valid: true, reason: null };
}
