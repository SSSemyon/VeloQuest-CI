import fs from 'node:fs/promises';

const checkedAt = '2026-08-09';
const models = [];

function inferCategory(name) {
  if (/turbo|powerplay|sam²|thron²|jarifa²/i.test(name)) return 'e_bike';
  if (/crux|diverge|gestalt|dsx|solo|allroad/i.test(name)) return 'gravel';
  if (/tarmac|roubaix|aethos|cct/i.test(name)) return 'road';
  if (/epic|chisel|stumpjumper|instinct|slayer|element|growler|fusion|blizzard|reaper|jam|sb\d|160e|revo bow/i.test(name)) return 'mountain';
  if (/sirrus|fairfax/i.test(name)) return 'fitness';
  return null;
}

function titleSpecs(name) {
  const patterns = [
    /Shimano XTR Di2/i, /Shimano XT Di2/i, /Shimano Dura-Ace Di2/i,
    /Shimano Ultegra Di2/i, /Shimano 105 Di2/i, /Shimano 105/i,
    /Shimano GRX/i, /Shimano Tiagra/i, /Shimano Claris/i,
    /SRAM XX SL AXS/i, /SRAM XX Transmission/i, /SRAM X0 AXS/i,
    /SRAM X0 Transmission/i, /SRAM GX AXS/i, /SRAM Rival XPLR AXS/i,
    /SRAM Rival eTAP AXS/i, /SRAM Force XPLR AXS/i, /SRAM Force eTAP AXS/i,
    /SRAM RED XPLR/i, /SRAM RED AXS/i, /SRAM Apex XPLR/i, /SRAM Apex eTAP AXS/i,
    /SRAM Apex/i, /SRAM S-1000 AXS/i
  ];
  const match = patterns.map((pattern) => name.match(pattern)?.[0]).find(Boolean);
  return match ? { drivetrain: match, drivetrain_title_evidence: true } : {};
}

function add({ brand, model, model_year, trim = '', market = 'global', category = inferCategory(model), manufacturer_url, evidence, specs = {} }) {
  models.push({
    brand, model, model_year, trim, market, category, manufacturer_url,
    evidence_checked_at: checkedAt,
    specs: { model_year_evidence: evidence, ...titleSpecs(model), ...specs }
  });
}

const specializedUrl = 'https://www.specialized.com/gb/en/bike-archive';
const specialized2026 = [
  'Crux Expert - SRAM Rival XPLR AXS',
  'Crux Pro - SRAM Force XPLR AXS',
  'S-Works Tarmac SL8 LTD - Red Bull 2025 TdF',
  'Turbo Levo 4 Pro',
  'S-Works Epic 8 EVO - Shimano XTR Di2, FOX Factory',
  'S-Works Turbo Levo 4',
  'Turbo Levo 4 Expert',
  'Turbo Levo 4 Comp',
  'S-Works Turbo Levo 4 Frameset',
  'Epic 8 Expert - Shimano XT Di2, RockShox Select+',
  'Epic 8 Expert - SRAM GX AXS, RockShox Select+',
  'S-Works Epic 8 - SRAM XX SL AXS, RockShox Ultimate Flight Attendant',
  'Epic 8 Pro - SRAM X0 AXS, RockShox Ultimate Flight Attendant',
  'Turbo Levo SL 2 Expert Di2',
  'S-Works Tarmac SL8 Frameset - FACT 12r Carbon',
  'Epic 8 Comp - SRAM S-1000 AXS, RockShox Select',
  'S-Works Epic 8 EVO - SRAM XX SL AXS, RockShox Ultimate',
  'Epic 8 Pro EVO Frameset - FOX FLOAT Factory',
  'Crux Comp - Shimano GRX',
  'S-Works Tarmac SL8 - SRAM RED AXS',
  'S-Works Tarmac SL8 - Shimano Dura-Ace Di2',
  'Crux Frameset - FACT 10r Carbon',
  'S-Works Crux Frameset - FACT 12r Carbon',
  'Diverge 4 Pro LTD - SRAM RED XPLR',
  'S-Works Tarmac SL8 Frameset LTD - Yoon Hyup',
  'S-Works Tarmac SL8 Frameset LTD - Lucas Beaufort',
  'S-Works Tarmac SL8 Frameset LTD - Parra',
  'S-Works Crux - SRAM RED XPLR',
  'S-Works Tarmac SL8 Frameset LTD - Demi Dreaming'
];
const specialized2025 = [
  'Epic 8 EVO Expert - SRAM GX AXS, FOX Performance Elite',
  'Roubaix SL8 Pro - Shimano Ultegra Di2',
  'Diverge Comp Carbon - SRAM Apex eTAP AXS',
  'S-Works Aethos Frameset - FACT 12r Carbon',
  "Allez Sprint Frameset - D'Aluisio Smartweld Alloy",
  'S-Works Tarmac SL8 - Shimano Dura-Ace Di2',
  'Tarmac SL8 Expert - Shimano Ultegra Di2',
  'Diverge Expert Carbon - SRAM Rival eTAP AXS / GX Eagle AXS',
  'Tarmac SL8 Pro - SRAM Force eTAP AXS',
  'Diverge E5 - Shimano Claris',
  'Chisel Hardtail Comp',
  'Diverge E5 Elite - Shimano GRX',
  'S-Works Stumpjumper 15 Frameset - FOX FLOAT GENIE Factory',
  'S-Works Tarmac SL8 LTD - Forward 50 Collection',
  'S-Works Crux - SRAM RED XPLR',
  'Crux Pro - SRAM Force XPLR eTAP AXS',
  'S-Works Crux Frameset - FACT 12r Carbon',
  'Turbo Tero 4.0',
  'Diverge Sport Carbon - Shimano GRX',
  'S-Works Tarmac SL8 Frameset - Ready to Paint',
  'Tarmac SL7 Comp - Shimano 105 Di2',
  'S-Works Tarmac SL8 Frameset - FACT 12r Carbon',
  'Turbo Levo 3 Comp Carbon',
  "Crux DSW Frameset - D'Aluisio Smartweld Alloy",
  'Crux DSW Comp - SRAM Apex XPLR',
  'Turbo Levo 3',
  'Tarmac SL8 Pro - Shimano Ultegra Di2',
  'S-Works Tarmac SL8 LTD - SRAM RED AXS',
  'S-Works Aethos LTD - SRAM RED AXS',
  'S-Works Tarmac SL8 - SRAM RED AXS',
  'Tarmac SL8 Expert - SRAM Rival eTAP AXS',
  'Diverge Comp E5 - SRAM Apex',
  'Epic 8 EVO Comp - SRAM S-1000 AXS, FOX Performance',
  'Epic 8 Comp - SRAM S-1000 AXS, RockShox Select',
  'Tarmac SL7 Sport - Shimano 105',
  'Chisel Comp Shimano',
  'Turbo Vado 4.0',
  'Turbo Levo SL 2 Comp',
  'S-Works Turbo Levo SL 2',
  'Turbo Levo SL 2 Comp Alloy',
  'Turbo Levo SL 2 Pro',
  'Turbo Levo SL 2 Öhlins Coil',
  'Turbo Levo SL 2 Expert',
  'Turbo Tero 4.0 Step-Through',
  'Roubaix SL8 - Shimano Tiagra',
  'Crux Comp - Shimano GRX',
  'Crux Expert - SRAM Rival XPLR eTAP AXS',
  'S-Works Stumpjumper 15 LTD - FOX DHX Live Valve Neo',
  'Roubaix SL8 Comp - Shimano 105 Di2',
  'Turbo Kenevo SL 2 Expert',
  'Roubaix SL8 Expert - SRAM Rival eTAP AXS',
  'S-Works Turbo Levo SL 2 LTD - FOX DHX Live Valve Neo',
  'S-Works Tarmac SL8 Team Frameset - FDJ - SUEZ',
  "S-Works Tarmac SL8 LTD - Remco's Golden Season",
  'S-Works Turbo Creo 2 - SRAM RED / XX1 Eagle AXS',
  'Sirrus X 5.0',
  'Turbo Vado 4.0 Step-Through',
  'Turbo Tero 4.0 EQ',
  'S-Works Tarmac SL8 Team Frameset - Soudal Quick-Step',
  'S-Works Tarmac SL8 Team Frameset - Red Bull - BORA - hansgrohe'
];
for (const model of specialized2026) add({ brand: 'Specialized', model, model_year: 2026, manufacturer_url: specializedUrl, evidence: 'official Specialized Bike Archive result explicitly labels this model 2026' });
for (const model of specialized2025) add({ brand: 'Specialized', model, model_year: 2025, manufacturer_url: specializedUrl, evidence: 'official Specialized Bike Archive result explicitly labels this model 2025' });

const rockyUrl = 'https://bikes.com/collections/2024-bikes';
const rocky = [
  ['Blizzard Carbon 30', {}],
  ['Growler 20', {}],
  ['Instinct Powerplay Alloy 70', { fork: 'RockShox Lyrik Select', rear_shock: 'RockShox Super Deluxe Select+', drivetrain: 'Shimano XT' }],
  ['Instinct Powerplay Alloy 50', { fork: 'RockShox Revelation Select RC', rear_shock: 'RockShox Deluxe Select+', drivetrain: 'Shimano SLX' }],
  ['Blizzard Powerplay Alloy 30', { drivetrain: 'MicroShift Advent X 10-speed', brakes: 'SRAM Level 2-piston' }],
  ['Flow', {}],
  ['Blizzard Carbon 50', {}],
  ['Solo Carbon 70', {}],
  ['Slayer Carbon 50', {}],
  ['Slayer Alloy 30', {}],
  ['Reaper Powerplay 24', { fork: 'RockShox Reba R 120 mm', brakes: 'Tektro HD-J285', dropper_post: 'X-Fusion Manic Composite' }],
  ['Instinct Powerplay Carbon 50', { fork: 'RockShox Lyrik Select', rear_shock: 'RockShox Deluxe Select+', drivetrain: 'Shimano SLX' }],
  ['Instinct Alloy 30', { fork: 'RockShox 35 Gold RL', rear_shock: 'RockShox Deluxe Select RT', drivetrain: 'Shimano Deore' }],
  ['Element Carbon 70', {}],
  ['Soul 10', {}],
  ['Slayer Carbon 70', {}],
  ['Instinct Carbon 30', { fork: 'Marzocchi Z2 Rail', rear_shock: 'Fox Float DPS Performance', drivetrain: 'Shimano Deore' }],
  ['Instinct Alloy 50', { fork: 'Fox 36 GRIP Performance', rear_shock: 'Fox Float X Performance', drivetrain: 'Shimano XT' }],
  ['Growler 40', {}],
  ['Fusion Powerplay 10', {}],
  ['Flow Jr 24', {}],
  ['Blizzard Powerplay Alloy 50', { drivetrain: 'SRAM GX Eagle', brakes: 'SRAM G2 R 4-piston' }],
  ['Altitude Alloy 50', { fork: 'Fox 38 Float EVOL GRIP', rear_shock: 'Fox Float X Performance', drivetrain: 'Shimano SLX', brakes: 'Shimano SLX Trail 4-piston' }],
  ['Soul 20', {}],
  ['Solo Carbon 50', { drivetrain: 'SRAM Apex XPLR AXS' }],
  ['Solo Alloy 50', { drivetrain: 'SRAM Apex 1x12' }],
  ['Solo Alloy 30', { drivetrain: 'SRAM Apex 1x11' }],
  ['Slayer Carbon 90', {}],
  ['Slayer C Frameset', {}],
  ['Slayer Alloy 50', {}],
  ['Slayer Alloy 30 Park', {}],
  ['Reaper Powerplay 26', { fork: 'RockShox Reba R 140 mm', brakes: 'Tektro HD-J285', dropper_post: 'X-Fusion Manic Composite' }],
  ['Instinct Powerplay Carbon 70', { fork: 'Fox 36 E-MTB Float EVOL GRIP Performance', rear_shock: 'Fox Float X Performance', drivetrain: 'Shimano XT' }],
  ['Instinct Carbon 99', { fork: 'RockShox Lyrik Ultimate Flight Attendant', rear_shock: 'RockShox Super Deluxe Ultimate Flight Attendant', drivetrain: 'SRAM X0 Transmission Wireless' }],
  ['Instinct Carbon 90', { fork: 'Fox 36 GRIP2 Factory', rear_shock: 'Fox Float X Factory', drivetrain: 'Shimano XTR' }],
  ['Instinct Carbon 70', { fork: 'Fox 36 Performance Elite', rear_shock: 'Fox Float X Performance Elite', drivetrain: 'Shimano XT' }],
  ['Instinct Carbon 70', { fork: 'RockShox Lyrik Select+', rear_shock: 'RockShox Super Deluxe Ultimate', drivetrain: 'SRAM X0 Transmission Wireless' }, 'SRAM X0 Transmission'],
  ['Instinct Carbon 50', { fork: 'RockShox Lyrik Select RC', rear_shock: 'Fox Float X Performance', drivetrain: 'Shimano XT' }],
  ['Instinct C Frameset', { rear_shock: 'Fox Float X Factory' }],
  ['Instinct Alloy 10', { fork: 'RockShox Recon Silver RL', rear_shock: 'RockShox Deluxe Select', drivetrain: 'Shimano CUES' }],
  ['Growler Jr 20', {}],
  ['Fusion Powerplay 30', { drivetrain: 'Shimano SLX', brakes: 'Shimano MT4100 2-piston' }],
  ['Fusion 30', {}],
  ['Fusion 10', { fork: 'SR Suntour XCM32', drivetrain: 'MicroShift Advent' }],
  ['Element Carbon 99', { fork: 'RockShox SID Ultimate Flight Attendant', rear_shock: 'RockShox SIDLuxe Ultimate Flight Attendant', drivetrain: 'SRAM XX Transmission Wireless' }],
  ['Element Carbon 90', {}]
];
for (const [model, specs, trim = ''] of rocky) add({ brand: 'Rocky Mountain', model, trim, model_year: 2024, manufacturer_url: rockyUrl, evidence: 'official Rocky Mountain 2024 Bikes archive collection result', specs });

const marinUrl = 'https://marinbikes.com/collections/2024-archive';
const marin2024 = [
  'Alpine Trail E2','Rift Zone XR AXS','Alpine Trail E1','Alpine Trail E','Rift Zone E',
  'Team Marin 2','Gestalt XR','Rift Zone 2','San Quentin 3','DSX FS','Rift Zone Jr 26"',
  'Rift Zone Jr 24"','El Roy','Team Marin 1','Alcatraz','San Quentin 2','DSX 2','DSX 1','DSX','Fairfax 2'
];
for (const model of marin2024) add({ brand: 'Marin', model, model_year: 2024, manufacturer_url: marinUrl, evidence: 'official Marin 2024 Archive collection result' });
add({ brand: 'Marin', model: 'San Quentin 24"', model_year: 2025, manufacturer_url: marinUrl, evidence: 'official Marin archive result explicitly labels this model 2025' });

const yetiUrl = 'https://yeticycles.com/en-us/archive';
const yetiRanges = [
  ['SB165', 2023, 2026], ['SB140 29', 2023, 2025], ['SB120', 2023, 2025],
  ['160E', 2022, 2024], ['SB160', 2023, 2025], ['SB165 27.5', 2020, 2023],
  ['SB140 27.5', 2020, 2023], ['SB115', 2021, 2022], ['SB130', 2020, 2022],
  ['SB150', 2020, 2022], ['SB100', 2020, 2020]
];
for (const [model, from, to] of yetiRanges) {
  for (let year = from; year <= to; year += 1) add({ brand: 'Yeti', model, model_year: year, manufacturer_url: yetiUrl, evidence: `official Yeti Bike Archive labels ${model} ${from}-${to}`, specs: model.includes('27.5') ? { wheel_size: '27.5' } : {} });
}

const focusFamilies = [
  ['JAM ALU', 2022, 2025, 'https://www.focus-bikes.com/int/archive/bikes/jam/pdp-jam-alu-2022-2025'],
  ['JAM ALU LTD', 2021, 2021, 'https://www.focus-bikes.com/int/archive/bikes/jam'],
  ['JAM CARBON', 2020, 2021, 'https://www.focus-bikes.com/int/archive/bikes/jam'],
  ['JAM CARBON', 2022, 2022, 'https://www.focus-bikes.com/int/archive/bikes/jam'],
  ['FOCUS SAM² Bosch', 2023, 2024, 'https://www.focus-bikes.com/int/archive/e-bikes/focus-sam'],
  ['FOCUS SAM² Bosch', 2021, 2022, 'https://www.focus-bikes.com/int/archive/e-bikes/focus-sam'],
  ['FOCUS SAM² Shimano', 2020, 2020, 'https://www.focus-bikes.com/int/archive/e-bikes/focus-sam'],
  ['THRON² Bosch', 2022, 2024, 'https://www.focus-bikes.com/int/archive/e-bikes/thron/pdp-thron-2022-2024-bosch'],
  ['THRON² EQP Bosch', 2022, 2024, 'https://www.focus-bikes.com/int/archive/e-bikes/thron/pdp-thron-eqp-2022-2024-bosch'],
  ['JARIFA² Bosch', 2020, 2022, 'https://www.focus-bikes.com/int/archive/e-bikes/jarifa/pdp-jarifa-2020-2022-bosch'],
  ['ATLAS 6 series', 2020, 2025, 'https://www.focus-bikes.com/de_de/archive/bikes/atlas/pdp-atlas-6-series-2020-2025']
];
for (const [model, from, to, manufacturer_url] of focusFamilies) {
  for (let year = from; year <= to; year += 1) add({ brand: 'FOCUS', model, model_year: year, manufacturer_url, evidence: `official FOCUS archive page labels this generation ${from}-${to}` });
}

add({
  brand: 'Corratec', model: 'Allroad Travel EQ', model_year: 2026, category: 'gravel',
  manufacturer_url: 'https://www.corratec.com/en/Bike-Archive/Allroad-Travel-EQ-Bronze-Dark-Bronze-46.html',
  evidence: 'official exact Corratec product page explicitly states model year 2026',
  specs: { frame_material: 'aluminium', wheel_size: '700c / 622', drivetrain_brand: 'Shimano', drivetrain: 'Shimano CUES 2x10', rear_derailleur: 'Shimano RD-U6020', cassette: 'Shimano CS-LG300-10 11-39T', chain: 'Shimano CN-LG500', brakes: 'Shimano BR-U6030 160/160 mm', fork: 'Allroad aluminium fork', weight_kg: 13.95 }
});
add({
  brand: 'Corratec', model: 'Revo Bow iLink SL Pro', model_year: 2026, category: 'xc_full_suspension',
  manufacturer_url: 'https://www.corratec.com/en/Bike-Archive/Revo-Bow-iLink-SL-Pro-Grey-Black-Light-Grey-M.html',
  evidence: 'official exact Corratec product page explicitly states model year 2026',
  specs: { frame_material: 'carbon', wheel_size: '29', drivetrain_brand: 'SRAM', drivetrain: 'SRAM X0 Eagle AXS Transmission 1x12', rear_derailleur: 'SRAM X0 Eagle AXS T-Type', cassette: 'SRAM XS-1275 T-Type 10-52T', brakes: 'SRAM Level Silver Stealth 4-piston 180/160 mm', fork: 'RockShox SID Select 3P 120 mm', rear_shock: 'RockShox SID Select+ 190x45', weight_kg: 12.7 }
});

const unique = [...new Map(models.map((model) => [
  [model.brand.toLowerCase(), model.model.toLowerCase(), model.model_year, model.trim.toLowerCase(), model.market.toLowerCase()].join('|'),
  model
])).values()];

await fs.writeFile(new URL('./batches/wave15.json', import.meta.url), `${JSON.stringify({ wave: 15, generated_at: checkedAt, models: unique }, null, 2)}\n`);
console.log(JSON.stringify({ input: models.length, unique: unique.length, brands: [...new Set(unique.map((model) => model.brand))].sort() }, null, 2));
