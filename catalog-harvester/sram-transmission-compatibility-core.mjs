const cleanText = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/giu, ' ')
  .replace(/&amp;/giu, '&')
  .replace(/<[^>]+>/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

const officialSramEvidence = (value) => {
  try {
    const url = new URL(String(value ?? ''));
    return url.protocol === 'https:' && (url.hostname === 'sram.com' || url.hostname.endsWith('.sram.com'));
  } catch {
    return false;
  }
};

const textOf = (component) => `${component?.model ?? ''} ${component?.display_name ?? ''} ${component?.specs?.system ?? ''} ${component?.specs?.chain_technology ?? ''}`;
const isDh = (component) => /\bDH\s+Transmission\b/iu.test(textOf(component));
const isTransmission = (component) => {
  const text = textOf(component);
  return /\bEagle\s+Transmission\b/iu.test(text)
    || (/\bT-Type\b/iu.test(text) && !isDh(component));
};

export function materializeSramEagleTransmissionCompatibility({ html, components }) {
  const pageText = cleanText(html);
  const hasSystemRule = /T-Type[^.]{0,180}engineered to work with the Transmission only/iu.test(pageText)
    && /mix and match Eagle components remains within each system/iu.test(pageText);
  const hasDhException = /XX DH Transmission[^.]{0,180}not cross-compatible[^.]{0,180}Eagle Transmission/iu.test(pageText);
  if (!hasSystemRule || !hasDhException) {
    return { pairs: [], unresolved: [{ reason: 'official SRAM T-Type mix-and-match rule with DH exception not found' }] };
  }

  const rows = Array.isArray(components) ? components : [];
  const targets = rows.filter((component) =>
    String(component?.brand ?? '').toLocaleLowerCase() === 'sram'
    && component?.category === 'cassette'
    && isTransmission(component)
    && !isDh(component)
    && officialSramEvidence(component?.evidence_url)
  );
  const pairs = [];
  const unresolved = [];

  for (const source of rows) {
    if (String(source?.brand ?? '').toLocaleLowerCase() !== 'sram') continue;
    if (source?.category !== 'rear_derailleur') continue;
    if (isDh(source)) {
      if (/Transmission/iu.test(textOf(source))) unresolved.push({ source_component_id: source.id, reason: 'XX DH Transmission is explicitly excluded from standard Eagle Transmission cross-compatibility' });
      continue;
    }
    if (!isTransmission(source)) continue;
    if (targets.length === 0) {
      unresolved.push({ source_component_id: source.id, reason: 'no exact official non-DH T-Type cassette target registered' });
      continue;
    }
    for (const target of targets) {
      pairs.push({
        source_component_id: source.id,
        target_component_id: target.id,
        status: 'compatible',
        rule_summary: `SRAM states that T-Type parts are engineered for Eagle Transmission and that Eagle components may be mixed within the same system; ${target.id} is an official non-DH T-Type Eagle Transmission cassette.`,
      });
    }
  }

  return {
    pairs: [...new Map(pairs.map((pair) => [`${pair.source_component_id}|${pair.target_component_id}`, pair])).values()]
      .sort((a, b) => a.source_component_id.localeCompare(b.source_component_id) || a.target_component_id.localeCompare(b.target_component_id)),
    unresolved,
  };
}
