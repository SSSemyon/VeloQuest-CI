function cassetteRange(component) {
  const text = `${component?.model ?? ''} ${component?.display_name ?? ''} ${component?.specs?.range ?? ''} ${component?.specs?.cassette_range ?? ''}`;
  const match = text.match(/\b(\d{1,2})\s*[-–]\s*(\d{2})\s*T?\b/u);
  return match ? `${Number(match[1])}-${Number(match[2])}` : null;
}

const RULES = {
  ekar: {
    speeds: 13,
    ranges: new Set(['9-36', '9-42', '10-44']),
    confirms: (html) => /all\s+three\s+cassette\s+(?:gearing\s+)?options[\s\S]*from\s+9-36\s+to\s+10-44/iu.test(html),
    sourceMatches: (text) => /\bEkar\b/iu.test(text) && !/\bEkar\s+GT\b/iu.test(text),
  },
  'ekar-gt': {
    speeds: 13,
    ranges: new Set(['9-36', '9-42', '10-44', '10-48']),
    confirms: (html) => /all\s+four[\s\S]*cassette\s+combination\s+options[\s\S]*from\s+9-36\s+to\s+10-48/iu.test(html)
      || /compatible[\s\S]*all\s+four[\s\S]*from\s+9-36\s+to\s+10-48/iu.test(html),
    sourceMatches: (text) => /\bEkar\s+GT\b/iu.test(text),
  },
  'super-record-wireless-12': {
    speeds: 12,
    ranges: new Set(['10-25', '10-27', '10-29']),
    confirms: (html) => /single\s+rear\s+derailleur[\s\S]*all\s+three\s+cassettes[\s\S]*10-25[\s\S]*10-27[\s\S]*10-29/iu.test(html),
    sourceMatches: (text) => /\bSuper\s+Record\b[\s\S]*\bWireless\b|\bWireless\b[\s\S]*\bSuper\s+Record\b/iu.test(text),
  },
};

export function materializeCampagnoloCassetteCompatibility({ html, components, family }) {
  if (!Array.isArray(components)) throw new TypeError('components must be an array');
  const rule = RULES[family];
  if (!rule) throw new Error(`unsupported Campagnolo family ${family}`);
  if (!rule.confirms(String(html ?? ''))) {
    return { pairs: [], unresolved: [{ reason: `official Campagnolo ${family} assertions not found` }] };
  }

  const sources = components.filter((component) => {
    if (String(component?.brand ?? '').toLocaleLowerCase() !== 'campagnolo') return false;
    if (component?.category !== 'rear_derailleur' || Number(component?.specs?.speeds) !== rule.speeds) return false;
    return rule.sourceMatches(`${component?.model ?? ''} ${component?.display_name ?? ''}`);
  });
  const targets = components.filter((component) =>
    String(component?.brand ?? '').toLocaleLowerCase() === 'campagnolo'
    && component?.category === 'cassette'
    && Number(component?.specs?.speeds) === rule.speeds
  );

  const pairs = [];
  for (const source of sources) {
    for (const target of targets) {
      const range = cassetteRange(target);
      if (!range || !rule.ranges.has(range)) continue;
      pairs.push({
        source_component_id: source.id,
        target_component_id: target.id,
        status: 'compatible',
        notes: `Campagnolo ${family} manufacturer page explicitly covers cassette range ${range}.`,
      });
    }
  }
  pairs.sort((a, b) => `${a.source_component_id}|${a.target_component_id}`.localeCompare(`${b.source_component_id}|${b.target_component_id}`));
  return { pairs, unresolved: [] };
}
