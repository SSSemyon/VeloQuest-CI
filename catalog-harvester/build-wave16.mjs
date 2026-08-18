import fs from 'node:fs/promises';

const checkedAt = '2026-08-09';
const models = [];

function inferCategory(name) {
  if (/e-|xtra watt|path/i.test(name)) return 'e_bike';
  if (/backroad|asket|road rage/i.test(name)) return 'gravel';
  if (/xelius/i.test(name)) return 'road';
  if (/ground control|root miller|bonero|riot|poacha|lector|nirvana|kato|lanao/i.test(name)) return 'mountain';
  return null;
}

function add({ brand, model, model_year, category = inferCategory(model), manufacturer_url, evidence, specs = {} }) {
  models.push({
    brand,
    model,
    model_year,
    trim: '',
    market: 'global',
    category,
    manufacturer_url,
    evidence_checked_at: checkedAt,
    specs: { model_year_evidence: evidence, ...specs }
  });
}

const roseUrl = 'https://www.rosebikes.com/support/manuals';
for (const [model, from, to] of [
  ['Ground Control', 2020, 2024],
  ['Root Miller', 2020, 2024],
  ['Bonero', 2022, 2024]
]) {
  for (let year = from; year <= to; year += 1) {
    add({
      brand: 'ROSE', model, model_year: year, manufacturer_url: roseUrl,
      evidence: `official ROSE frame-details index labels ${model} ${from}-${to}`
    });
  }
}
for (const [model, year] of [
  ['Backroad AL', 2025], ['Backroad CF', 2025], ['Xtra Watt Evo', 2021], ['Xtra Watt Evo', 2025]
]) {
  add({
    brand: 'ROSE', model, model_year: year, manufacturer_url: roseUrl,
    evidence: `official ROSE frame-details index explicitly labels ${model} ${year}`
  });
}

add({
  brand: 'Lapierre', model: 'E-Explorer 5.5 Low', model_year: 2026, category: 'e_bike',
  manufacturer_url: 'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub',
  evidence: 'official exact Lapierre product description explicitly states E-Explorer 5.5 Low 2026',
  specs: {
    frame_material: 'aluminium', wheel_size: '27.5', motor: 'Bosch Performance Line 75 Nm',
    battery: 'Bosch 540 Wh', drivetrain: 'Shimano CUES 9-speed', rear_derailleur: 'Shimano CUES RD-U3020-9',
    cassette: 'Shimano CUES CS-LG300-9', chain: 'KMC eGlide EPT 9-11s',
    fork: 'Suntour XCM32-Boost RL DS 100 mm', brakes: 'Tektro HD-M280 2-piston 203/203 mm'
  }
});
add({
  brand: 'Lapierre', model: 'E-Explorer 6.5 Low', model_year: 2026, category: 'e_bike',
  manufacturer_url: 'https://lapierrebikes.com/en-int/products/e-explorer-65-llcub',
  evidence: 'official exact Lapierre product description explicitly states E-Explorer 6.5 Low 2026',
  specs: {
    frame_material: 'aluminium', wheel_size: '27.5', motor: 'Bosch Performance Line PX 75 Nm',
    battery: 'Bosch PowerTube 500 Wh', drivetrain: 'Shimano Deore/CUES 9-speed', rear_derailleur: 'Shimano CUES RD-U3020-9',
    cassette: 'Shimano CUES CS-LG300-9', chain: 'KMC eGlide EPT 9-11s',
    fork: 'Suntour XCM32-Boost RL DS 110 mm', brakes: 'Tektro HD-M280 2-piston 203/203 mm'
  }
});
add({
  brand: 'Lapierre', model: 'Xelius DRS Team Replica', model_year: 2026, category: 'road',
  manufacturer_url: 'https://lapierrebikes.com/en-int/pages/bikes/xelius-drs-team-replica',
  evidence: 'official exact Lapierre page explicitly describes the 2026 Team Replica design',
  specs: { frame_material: 'carbon', drivetrain: 'Shimano Dura-Ace Di2 12-speed', wheels: 'Ursus Proxima 40', weight_kg: 7.25 }
});

const ghostUrl = 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings';
const ghostByYear = new Map([
  [2025, ['E-Riot', 'Path Asket', 'Poacha']],
  [2024, [
    'E-Riot', 'E-ASX', 'E-Teru Pro Advanced', 'E-Teru Universal', 'E-Teru Essential',
    'Lector', 'Lector FS', 'Nirvana 4X', 'Nirvana Tour', 'Nirvana Trail',
    'Riot AL', 'Riot CF', 'Path Riot', 'Asket AL', 'Path Asket'
  ]],
  [2023, [
    'E-Riot 750WH', 'E-ASX', 'E-Teru Essential', 'E-Teru Pro Advanced', 'Kato FS',
    'Kato / Lanao', 'Lector FS SF', 'Lector SF', 'Nirvana 4X', 'Nirvana Tour',
    'Nirvana Trail', 'Riot AL', 'Path Riot', 'Asket AL', 'Path Asket'
  ]],
  [2022, [
    'Lector SF', 'Lector FS SF', 'Kato FS', 'Nirvana 4X', 'Nirvana Trail',
    'Road Rage AL', 'E-ASX Essential', 'E-ASX Universal Advanced', 'E-Riot AL', 'E-Riot CF',
    'E-Teru Essential Low EQ', 'E-Teru Essential Mid EQ', 'E-Teru Universal Low EQ',
    'E-Teru Universal EQ', 'E-Teru Pro Advanced', 'Riot'
  ]],
  [2021, ['Nirvana Tour']]
]);
for (const [year, names] of ghostByYear) {
  for (const model of names) {
    add({
      brand: 'GHOST', model, model_year: year, manufacturer_url: ghostUrl,
      evidence: `official GHOST exploded-drawings index lists this model under ${year}${year === 2021 ? ' and labels it MY21' : ''}`
    });
  }
}

const unique = [...new Map(models.map((model) => [
  [model.brand.toLowerCase(), model.model.toLowerCase(), model.model_year, model.trim, model.market].join('|'),
  model
])).values()];

await fs.writeFile(new URL('./batches/wave16.json', import.meta.url), `${JSON.stringify({ wave: 16, generated_at: checkedAt, models: unique }, null, 2)}\n`);
console.log(JSON.stringify({ input: models.length, unique: unique.length, brands: [...new Set(unique.map((model) => model.brand))].sort() }, null, 2));
