const KNOWN_COMPONENT_BRANDS = [
  'Shimano', 'SRAM', 'Campagnolo', 'TRP', 'Magura', 'Hope', 'MicroSHIFT', 'microSHIFT',
  'RockShox', 'FOX', 'Fox', 'Marzocchi', 'Öhlins', 'Ohlins', 'Manitou', 'SR Suntour', 'Suntour', 'DVO',
  'DT Swiss', 'Mavic', 'Fulcrum', 'Zipp', 'Roval', 'Syncros', 'Bontrager', 'Reserve', 'Crankbrothers',
  'Maxxis', 'Schwalbe', 'Continental', 'Vittoria', 'Pirelli', 'WTB', 'Michelin',
  'Race Face', 'FSA', 'Praxis', 'Rotor',
  'Bosch', 'Brose', 'TQ', 'Fazua', 'Yamaha', 'Bafang', 'Mahle',
];

const decodeHtml = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));

const cleanText = (value) => decodeHtml(value)
  .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeLabel = (value) => cleanText(value)
  .toLocaleLowerCase()
  .replace(/[\s:_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function jsonValue(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return cleanText(value);
  if (Array.isArray(value)) return cleanText(value.map(jsonValue).filter(Boolean).join(' / '));
  if (typeof value === 'object') return cleanText(value.value ?? value.name ?? value.description ?? value.text ?? '');
  return '';
}

function collectJsonLd(html, properties, media, identities) {
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed;
    try { parsed = JSON.parse(decodeHtml(match[1]).trim()); } catch { continue; }
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
      if (types.includes('Product')) {
        for (const identity of [jsonValue(node.name), jsonValue(node.model), jsonValue(node.sku), jsonValue(node.mpn)]) {
          if (identity) identities.push(identity);
        }
        const images = Array.isArray(node.image) ? node.image : [node.image];
        for (const image of images) {
          const raw = typeof image === 'object' ? image?.url ?? image?.contentUrl : image;
          if (typeof raw === 'string' && raw.startsWith('https://')) media.push({ image_url: raw, discovered_from: 'json-ld' });
        }
        const additional = Array.isArray(node.additionalProperty) ? node.additionalProperty : [node.additionalProperty];
        for (const item of additional) {
          if (!item || typeof item !== 'object') continue;
          const label = jsonValue(item.name ?? item.propertyID);
          const value = jsonValue(item.value ?? item.valueReference ?? item.description);
          if (label && value) properties.push({ label, value, source: 'json-ld' });
        }
      }
      Object.values(node).forEach(visit);
    };
    visit(parsed);
  }
}

function collectMetaMedia(html, media) {
  const patterns = [
    /<meta\b[^>]*(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
    /<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*>/gi,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const url = decodeHtml(match[1]).trim();
      if (url.startsWith('https://')) media.push({ image_url: url, discovered_from: 'meta' });
    }
  }
}

function collectPageIdentities(html, sourcePageUrl, identities) {
  const patterns = [
    /<meta\b[^>]*(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
    /<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*>/gi,
    /<title\b[^>]*>([\s\S]*?)<\/title>/gi,
    /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const identity = cleanText(match[1]);
      if (identity) identities.push(identity);
    }
  }
  try {
    const url = new URL(sourcePageUrl);
    identities.push(decodeURIComponent(url.pathname));
  } catch {
    // Source URL validity is enforced by the manifest/official-host layer.
  }
}

function collectTablePairs(html, properties) {
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((match) => cleanText(match[1])).filter(Boolean);
    if (cells.length >= 2) properties.push({ label: cells[0], value: cells.slice(1).join(' / '), source: 'table' });
  }
}

function collectDefinitionPairs(html, properties) {
  const pattern = /<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi;
  for (const match of html.matchAll(pattern)) {
    const label = cleanText(match[1]);
    const value = cleanText(match[2]);
    if (label && value) properties.push({ label, value, source: 'definition-list' });
  }
}

function dedupeProperties(properties) {
  return [...new Map(properties.map((item) => [
    `${normalizeLabel(item.label)}|${item.value}`,
    { ...item, label: cleanText(item.label), value: cleanText(item.value) },
  ])).values()];
}

function valuesFor(properties, label) {
  const normalized = normalizeLabel(label);
  return [...new Map(properties
    .filter((item) => normalizeLabel(item.label) === normalized)
    .map((item) => [item.value, item])).values()];
}

function resolvePriority(properties, labels, field, ambiguities) {
  for (const label of labels) {
    const candidates = valuesFor(properties, label);
    const values = [...new Set(candidates.map((item) => item.value))];
    if (values.length > 1) {
      ambiguities.push({ field, values });
      return undefined;
    }
    if (candidates.length === 1) {
      const candidate = candidates[0];
      return { value: candidate.value, source_label: candidate.label, source_value: candidate.value, source: candidate.source };
    }
  }
  return undefined;
}

function normalizeFrameMaterial(value) {
  const text = String(value ?? '');
  if (/\bcarbon\b|\bfact\s*\d+r\b/i.test(text)) return 'Carbon';
  if (/\bal(?:uminium|uminum)?\s*\d{3,4}\b|\baluminium\b|\baluminum\b|\balloy\b/i.test(text)) return 'Aluminum';
  if (/\btitanium\b|\bti\s*[- ]?\d/i.test(text)) return 'Titanium';
  if (/\bchromoly\b|\bcr-?mo\b|\bsteel\b/i.test(text)) return 'Steel';
  return undefined;
}

function componentBrand(value) {
  const normalized = String(value ?? '').trim().toLocaleLowerCase();
  return KNOWN_COMPONENT_BRANDS.find((brand) => normalized.startsWith(brand.toLocaleLowerCase())) ?? null;
}

function resolveBrakes(properties, ambiguities) {
  const aggregate = resolvePriority(properties, ['brakes', 'brake system', 'brake'], 'brakes', ambiguities);
  if (aggregate) return aggregate;

  const front = resolvePriority(properties, ['front brake', 'front brakes'], 'brakes_front', ambiguities);
  const rear = resolvePriority(properties, ['rear brake', 'rear brakes'], 'brakes_rear', ambiguities);
  if (front && rear) {
    if (front.value === rear.value) return { ...front, source_label: 'Front Brake + Rear Brake' };
    return {
      value: `Front: ${front.value} / Rear: ${rear.value}`,
      source_label: 'Front Brake + Rear Brake',
      source_value: `${front.value} / ${rear.value}`,
      source: `${front.source}+${rear.source}`,
    };
  }
  return front ?? rear;
}

function addExplicitComponent({ components, properties, ambiguities, key, category, labels }) {
  const evidence = resolvePriority(properties, labels, key, ambiguities);
  if (!evidence) return;
  const brand = componentBrand(evidence.value);
  if (!brand) return;
  components[key] = {
    category,
    brand,
    display_name: evidence.value,
    source_label: evidence.source_label,
    source_value: evidence.source_value,
  };
}

export function parseProductEvidence({ brand, sourcePageUrl, html }) {
  if (typeof html !== 'string') throw new TypeError('html must be a string');
  const properties = [];
  const media = [];
  const identities = [];
  collectJsonLd(html, properties, media, identities);
  collectMetaMedia(html, media);
  collectPageIdentities(html, sourcePageUrl, identities);
  collectTablePairs(html, properties);
  collectDefinitionPairs(html, properties);

  const dedupedProperties = dedupeProperties(properties);
  const ambiguities = [];
  const canonical = {};

  const frameSource = resolvePriority(dedupedProperties, ['frame material', 'frame', 'frameset'], 'frame_material', ambiguities);
  const frameMaterial = normalizeFrameMaterial(frameSource?.value);
  if (frameSource && frameMaterial) canonical.frame_material = { ...frameSource, value: frameMaterial };

  const wheelSize = resolvePriority(dedupedProperties, ['wheel size', 'wheel sizes', 'wheelsize'], 'wheel_size', ambiguities);
  if (wheelSize) canonical.wheel_size = wheelSize;

  const drivetrain = resolvePriority(dedupedProperties, ['drivetrain', 'groupset', 'rear derailleur', 'rear derailer'], 'drivetrain', ambiguities);
  if (drivetrain) canonical.drivetrain = drivetrain;

  const brakes = resolveBrakes(dedupedProperties, ambiguities);
  if (brakes) canonical.brakes = brakes;

  const components = {};
  addExplicitComponent({
    components,
    properties: dedupedProperties,
    ambiguities,
    key: 'rear_derailleur',
    category: 'rear_derailleur',
    labels: ['rear derailleur', 'rear derailer'],
  });

  const brakeBrand = componentBrand(brakes?.value);
  if (brakes && brakeBrand && !/^Front:/i.test(brakes.value)) {
    components.brake_caliper = {
      category: 'brake_caliper',
      brand: brakeBrand,
      display_name: brakes.value,
      source_label: brakes.source_label,
      source_value: brakes.source_value,
    };
  }

  const explicitComponentFields = [
    ['fork', 'fork', ['fork', 'front fork', 'suspension fork']],
    ['rear_shock', 'rear_shock', ['rear shock', 'shock', 'rear suspension']],
    ['cassette', 'cassette', ['cassette', 'rear cassette']],
    ['crankset', 'crankset', ['crankset', 'crank set', 'cranks']],
    ['wheelset', 'wheelset', ['wheelset', 'wheels']],
    ['tire', 'tire', ['tires', 'tyres', 'tire', 'tyre']],
    ['motor', 'motor', ['motor', 'drive unit']],
    ['battery', 'battery', ['battery']],
    ['dropper_post', 'dropper_post', ['dropper post', 'dropper seatpost']],
  ];
  for (const [key, category, labels] of explicitComponentFields) {
    addExplicitComponent({ components, properties: dedupedProperties, ambiguities, key, category, labels });
  }

  const uniqueMedia = [...new Map(media.map((item) => [item.image_url, {
    ...item,
    source_page_url: sourcePageUrl,
    source_type: 'manufacturer',
  }])).values()];
  const uniqueIdentities = [...new Set(identities.map(cleanText).filter(Boolean))];

  return {
    brand,
    sourcePageUrl,
    identities: uniqueIdentities,
    media: uniqueMedia,
    properties: dedupedProperties,
    canonical,
    components,
    ambiguities,
  };
}