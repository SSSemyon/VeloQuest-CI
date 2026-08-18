import assert from 'node:assert/strict';
import test from 'node:test';

import { parseProductEvidence } from '../catalog-harvester/product-evidence-core.mjs';

const page = 'https://www.specialized.com/us/en/example-bike/p/123';

test('parses Product JSON-LD media, product identity and explicit core properties', () => {
  const html = `
    <html><head>
      <title>2026 Example Bike | Specialized</title>
      <meta property="og:title" content="2026 Example Bike">
      <meta property="og:image" content="https://assets.specialized.com/example-hero.webp">
      <script type="application/ld+json">
      {
        "@context":"https://schema.org",
        "@type":"Product",
        "name":"2026 Example Bike",
        "sku":"EXAMPLE-123",
        "image":["https://assets.specialized.com/example-hero.webp"],
        "additionalProperty":[
          {"@type":"PropertyValue","name":"Frame","value":"FACT 11m Carbon, Rider-First Engineered"},
          {"@type":"PropertyValue","name":"Wheel Size","value":"29"},
          {"@type":"PropertyValue","name":"Rear Derailleur","value":"SRAM GX Eagle Transmission"},
          {"@type":"PropertyValue","name":"Brakes","value":"SRAM Maven Silver, 4-piston"},
          {"@type":"PropertyValue","name":"Fork","value":"RockShox Pike Select+ 140mm"},
          {"@type":"PropertyValue","name":"Cassette","value":"SRAM XG-1275 Eagle 10-52T"},
          {"@type":"PropertyValue","name":"Tires","value":"Maxxis Dissector 29x2.4"}
        ]
      }
      </script>
    </head><body><h1>Example Bike</h1></body></html>`;

  const result = parseProductEvidence({ brand: 'Specialized', sourcePageUrl: page, html });

  assert.deepEqual(result.media.map((item) => item.image_url), [
    'https://assets.specialized.com/example-hero.webp',
  ]);
  assert.ok(result.identities.includes('2026 Example Bike'));
  assert.ok(result.identities.includes('Example Bike'));
  assert.ok(result.identities.some((identity) => identity.includes('/example-bike/')));
  assert.equal(result.canonical.frame_material?.value, 'Carbon');
  assert.equal(result.canonical.frame_material?.source_label, 'Frame');
  assert.equal(result.canonical.wheel_size?.value, '29');
  assert.equal(result.canonical.drivetrain?.value, 'SRAM GX Eagle Transmission');
  assert.equal(result.canonical.brakes?.value, 'SRAM Maven Silver, 4-piston');
  assert.equal(result.components.rear_derailleur?.display_name, 'SRAM GX Eagle Transmission');
  assert.equal(result.components.brake_caliper?.display_name, 'SRAM Maven Silver, 4-piston');
  assert.equal(result.components.brake_caliper?.brand, 'SRAM');
  assert.equal(result.components.fork?.brand, 'RockShox');
  assert.equal(result.components.fork?.category, 'fork');
  assert.equal(result.components.cassette?.brand, 'SRAM');
  assert.equal(result.components.tire?.brand, 'Maxxis');
  assert.deepEqual(result.ambiguities, []);
});

test('parses explicit table and definition-list label/value pairs', () => {
  const html = `
    <table>
      <tr><th>Frame</th><td>AL 6061-T6 Alloy</td></tr>
      <tr><th>Rear Derailleur</th><td>Shimano Deore XT RD-M8100</td></tr>
      <tr><th>Front Brake</th><td>Shimano XT M8120</td></tr>
      <tr><th>Rear Brake</th><td>Shimano XT M8120</td></tr>
      <tr><th>Rear Shock</th><td>FOX Float X Performance Elite</td></tr>
      <tr><th>Crankset</th><td>Race Face Aeffect R</td></tr>
      <tr><th>Wheelset</th><td>DT Swiss M 1900 Spline</td></tr>
    </table>
    <dl><dt>Wheel Size</dt><dd>700C</dd></dl>`;

  const result = parseProductEvidence({ brand: 'Example', sourcePageUrl: 'https://example.com/bike', html });

  assert.equal(result.canonical.frame_material?.value, 'Aluminum');
  assert.equal(result.canonical.wheel_size?.value, '700C');
  assert.equal(result.canonical.drivetrain?.value, 'Shimano Deore XT RD-M8100');
  assert.equal(result.canonical.brakes?.value, 'Shimano XT M8120');
  assert.equal(result.components.rear_derailleur?.brand, 'Shimano');
  assert.equal(result.components.brake_caliper?.display_name, 'Shimano XT M8120');
  assert.equal(result.components.brake_caliper?.brand, 'Shimano');
  assert.equal(result.components.rear_shock?.brand, 'FOX');
  assert.equal(result.components.crankset?.brand, 'Race Face');
  assert.equal(result.components.wheelset?.brand, 'DT Swiss');
});

test('does not create reusable brake component when front and rear models conflict', () => {
  const html = `
    <table>
      <tr><th>Front Brake</th><td>Shimano XT M8120</td></tr>
      <tr><th>Rear Brake</th><td>Shimano XT M8100</td></tr>
    </table>`;
  const result = parseProductEvidence({ brand: 'Example', sourcePageUrl: 'https://example.com/bike', html });
  assert.match(result.canonical.brakes?.value ?? '', /Front:/);
  assert.equal(result.components.brake_caliper, undefined);
});

test('does not create an exact OEM component when the component brand is not recognized', () => {
  const html = `<table><tr><th>Fork</th><td>Custom Factory Air 140mm</td></tr></table>`;
  const result = parseProductEvidence({ brand: 'Example', sourcePageUrl: 'https://example.com/bike', html });
  assert.equal(result.components.fork, undefined);
});

test('keeps conflicting explicit wheel-size values ambiguous instead of guessing', () => {
  const html = `
    <table>
      <tr><th>Wheel Size</th><td>29</td></tr>
      <tr><th>Wheel Size</th><td>27.5</td></tr>
    </table>`;

  const result = parseProductEvidence({ brand: 'Example', sourcePageUrl: 'https://example.com/bike', html });

  assert.equal(result.canonical.wheel_size, undefined);
  assert.deepEqual(result.ambiguities, [{ field: 'wheel_size', values: ['29', '27.5'] }]);
});

test('does not infer frame material from unrelated page copy', () => {
  const html = `<p>Carbon wheels available separately.</p><table><tr><th>Frame</th><td>Race chassis</td></tr></table>`;
  const result = parseProductEvidence({ brand: 'Example', sourcePageUrl: 'https://example.com/bike', html });
  assert.equal(result.canonical.frame_material, undefined);
});
