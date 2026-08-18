const cleanText = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/giu, ' ')
  .replace(/&amp;/giu, '&')
  .replace(/&quot;/giu, '"')
  .replace(/&#39;|&apos;/giu, "'")
  .replace(/<[^>]+>/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

const normalizeLabel = (value) => cleanText(value)
  .toLocaleLowerCase()
  .replace(/[:：]+$/u, '')
  .replace(/[\s_-]+/gu, ' ')
  .trim();

function normalizeFrameMaterial(value) {
  const text = String(value ?? '');
  if (/\bcarbon\b|\bfact\s*\d+r\b/iu.test(text)) return 'Carbon';
  if (/\baluminium\b|\baluminum\b|\balloy\b|\bal\s*\d{3,4}\b/iu.test(text)) return 'Aluminum';
  if (/\btitanium\b/iu.test(text)) return 'Titanium';
  if (/\bchromoly\b|\bcr-?mo\b|\bsteel\b/iu.test(text)) return 'Steel';
  return undefined;
}

const FIELD_BY_LABEL = new Map([
  ['frame', 'frame_material'],
  ['frame material', 'frame_material'],
  ['frameset', 'frame_material'],
  ['wheel size', 'wheel_size'],
  ['wheel sizes', 'wheel_size'],
  ['wheelsize', 'wheel_size'],
  ['drivetrain', 'drivetrain'],
  ['groupset', 'drivetrain'],
  ['rear derailleur', 'drivetrain'],
  ['rear derailer', 'drivetrain'],
  ['brakes', 'brakes'],
  ['brake system', 'brakes'],
  ['brake', 'brakes'],
]);

export function parseStrongListCanonical(html) {
  const candidates = new Map();
  const properties = [];
  for (const match of String(html ?? '').matchAll(/<li\b[^>]*>\s*<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>\s*([\s\S]*?)<\/li>/giu)) {
    const sourceLabel = cleanText(match[1]).replace(/[:：]+$/u, '').trim();
    const sourceValue = cleanText(match[2]).replace(/^[:：\-–]\s*/u, '');
    if (!sourceLabel || !sourceValue) continue;
    properties.push({ label: sourceLabel, value: sourceValue, source: 'strong-list' });

    const field = FIELD_BY_LABEL.get(normalizeLabel(sourceLabel));
    if (!field) continue;
    const value = field === 'frame_material' ? normalizeFrameMaterial(sourceValue) : sourceValue;
    if (!value) continue;
    if (!candidates.has(field)) candidates.set(field, new Set());
    candidates.get(field).add(value);
  }

  const canonical = {};
  const ambiguities = [];
  for (const [field, valuesSet] of candidates) {
    const values = [...valuesSet];
    if (values.length > 1) {
      ambiguities.push({ field, values });
      continue;
    }
    canonical[field] = {
      value: values[0],
      source_label: 'strong-list',
      source_value: values[0],
      source: 'strong-list',
    };
  }
  return { canonical, ambiguities, properties };
}

export function mergeSupplementalCanonical(evidence, supplemental) {
  evidence.canonical ??= {};
  evidence.ambiguities ??= [];
  for (const ambiguity of supplemental?.ambiguities ?? []) evidence.ambiguities.push(ambiguity);
  for (const [field, item] of Object.entries(supplemental?.canonical ?? {})) {
    const existing = evidence.canonical[field];
    if (!existing) {
      evidence.canonical[field] = item;
      continue;
    }
    if (String(existing.value) !== String(item.value)) {
      evidence.ambiguities.push({ field, values: [String(existing.value), String(item.value)] });
    }
  }
  return evidence;
}
