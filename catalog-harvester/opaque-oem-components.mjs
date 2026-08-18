const LABELS = new Map([
  ['rear derailleur', 'rear_derailleur'],
  ['rear derailer', 'rear_derailleur'],
  ['front derailleur', 'front_derailleur'],
  ['fork', 'fork'],
  ['front fork', 'fork'],
  ['suspension fork', 'fork'],
  ['rear shock', 'rear_shock'],
  ['shock', 'rear_shock'],
  ['rear suspension', 'rear_shock'],
  ['cassette', 'cassette'],
  ['rear cassette', 'cassette'],
  ['crankset', 'crankset'],
  ['crank set', 'crankset'],
  ['cranks', 'crankset'],
  ['wheelset', 'wheelset'],
  ['wheels', 'wheelset'],
  ['tires', 'tire'],
  ['tyres', 'tire'],
  ['tire', 'tire'],
  ['tyre', 'tire'],
  ['motor', 'motor'],
  ['drive unit', 'motor'],
  ['battery', 'battery'],
  ['dropper post', 'dropper_post'],
  ['dropper seatpost', 'dropper_post'],
  ['brakes', 'brake_caliper'],
  ['brake system', 'brake_caliper'],
  ['brake', 'brake_caliper'],
  ['front brake', 'brake_caliper'],
  ['front brakes', 'brake_caliper'],
  ['rear brake', 'brake_caliper'],
  ['rear brakes', 'brake_caliper'],
]);

const normalizeLabel = (value) => String(value ?? '')
  .toLocaleLowerCase()
  .replace(/[\s:_-]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

const meaningful = (value) => {
  const text = String(value ?? '').trim();
  return text.length >= 3 && !/^(?:n\/?a|none|not specified|unknown|[-–—])$/iu.test(text);
};

export function extractOpaqueOemComponents(evidence) {
  const represented = new Set(Object.values(evidence?.components ?? {})
    .map((component) => String(component?.source_value ?? component?.display_name ?? '').trim().toLocaleLowerCase())
    .filter(Boolean));
  const output = [];
  const seen = new Set();
  for (const property of evidence?.properties ?? []) {
    const label = normalizeLabel(property?.label);
    const category = LABELS.get(label);
    const value = String(property?.value ?? '').trim();
    if (!category || !meaningful(value)) continue;
    if (represented.has(value.toLocaleLowerCase())) continue;
    const key = `${category}|${value.toLocaleLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({
      category,
      display_name: value,
      source_label: String(property.label ?? '').trim(),
      source_value: value,
      manufacturer_unstated: true,
      identity_scope: 'bike_specific_exact_listing',
    });
  }
  return output;
}
