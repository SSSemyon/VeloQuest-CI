const normalizeBrand = (value) => String(value ?? '').toLocaleLowerCase().replace(/\s+/gu, '');

function familyOf(component) {
  const text = `${component?.model ?? ''} ${component?.display_name ?? ''}`.toUpperCase();
  if (/\bADVENT\s*X\b/u.test(text)) return { name: 'ADVENT X', speeds: 10, recommendedMin: 46, max: 48 };
  if (/\bACOLYTE\b/u.test(text)) return { name: 'Acolyte', speeds: 8, recommendedMin: 42, max: 46 };
  if (/\bADVENT\b/u.test(text)) return { name: 'ADVENT', speeds: 9, recommendedMin: 42, max: 46 };
  return null;
}

function maxCog(component) {
  for (const key of ['max_cog', 'max_teeth', 'largest_cog']) {
    const value = Number(component?.specs?.[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  const text = `${component?.model ?? ''} ${component?.display_name ?? ''} ${component?.specs?.range ?? ''} ${component?.specs?.cassette_range ?? ''}`;
  const values = [...text.matchAll(/(?:^|[-–\s])(\d{2})\s*T\b/giu)].map((match) => Number(match[1]));
  return values.length > 0 ? Math.max(...values) : null;
}

function confirmsOfficialRules(html) {
  const text = String(html ?? '');
  return /ADVENT X[^.]*standard\s+10\s*speed\s+cassette\s+spacing/iu.test(text)
    && /42\s*[-–]\s*46t?\s+for\s+Acolyte\s+and\s+Advent/iu.test(text)
    && /46\s*[-–]\s*48t?\s+for\s+ADVENT\s*X/iu.test(text)
    && /exceed\s+the\s+max\s+cog/iu.test(text);
}

export function materializeMicroshiftCassetteCompatibility({ html, components }) {
  if (!Array.isArray(components)) throw new TypeError('components must be an array');
  if (!confirmsOfficialRules(html)) {
    return { pairs: [], unresolved: [{ reason: 'official microSHIFT FAQ assertions not found' }] };
  }

  const pairs = [];
  const unresolved = [];
  const cassettes = components.filter((component) => component?.category === 'cassette');
  for (const source of components.filter((component) => normalizeBrand(component?.brand) === 'microshift' && component?.category === 'rear_derailleur')) {
    const family = familyOf(source);
    if (!family) {
      unresolved.push({ source_component_id: source.id, reason: 'unsupported microSHIFT family' });
      continue;
    }
    const sourceSpeeds = Number(source?.specs?.speeds) || family.speeds;
    for (const target of cassettes) {
      const targetSpeeds = Number(target?.specs?.speeds);
      if (!Number.isInteger(targetSpeeds) || targetSpeeds !== sourceSpeeds) continue;
      const targetMax = maxCog(target);
      if (!targetMax) continue;
      const status = targetMax > family.max
        ? 'incompatible'
        : targetMax < family.recommendedMin
          ? 'conditional'
          : 'compatible';
      pairs.push({
        source_component_id: source.id,
        target_component_id: target.id,
        status,
        notes: status === 'compatible'
          ? `${family.name} exact-speed cassette within official recommended max-cog range.`
          : status === 'conditional'
            ? `${family.name} exact-speed cassette below official recommended max-cog range; manufacturer says smaller range works with degraded shifting.`
            : `${family.name} cassette exceeds manufacturer maximum cog guidance.`,
      });
    }
  }

  pairs.sort((a, b) => `${a.source_component_id}|${a.target_component_id}`.localeCompare(`${b.source_component_id}|${b.target_component_id}`));
  unresolved.sort((a, b) => String(a.source_component_id ?? '').localeCompare(String(b.source_component_id ?? '')));
  return { pairs, unresolved };
}
