const COMPATIBILITY_BRANDS = ['Shimano', 'SRAM', 'microSHIFT', 'Campagnolo'];

const LABEL_CATEGORY = new Map([
  ['rear derailleur', ['rear_derailleur', 'rear_derailleur']],
  ['rear derailer', ['rear_derailleur', 'rear_derailleur']],
  ['cassette', ['cassette', 'cassette']],
  ['rear cassette', ['cassette', 'cassette']],
]);

const normalizeLabel = (value) => String(value ?? '')
  .toLocaleLowerCase()
  .replace(/[\s:_-]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

function brandOf(value) {
  const normalized = String(value ?? '').trim().toLocaleLowerCase();
  return COMPATIBILITY_BRANDS.find((brand) => normalized.startsWith(brand.toLocaleLowerCase())) ?? null;
}

export function extractKnownComponentsFromStructuredProperties(properties = []) {
  const byKey = new Map();
  for (const property of properties) {
    const mapping = LABEL_CATEGORY.get(normalizeLabel(property?.label));
    if (!mapping) continue;
    const [key, category] = mapping;
    const value = String(property?.value ?? '').trim();
    const brand = brandOf(value);
    if (!value || !brand) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push({
      category,
      brand,
      display_name: value,
      source_label: String(property?.label ?? '').trim(),
      source_value: value,
    });
  }

  const result = {};
  for (const [key, rows] of byKey) {
    const distinct = [...new Map(rows.map((row) => [row.display_name.toLocaleLowerCase(), row])).values()];
    if (distinct.length === 1) result[key] = distinct[0];
  }
  return result;
}
