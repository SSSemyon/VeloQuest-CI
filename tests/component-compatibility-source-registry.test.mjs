import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const registry = JSON.parse(fs.readFileSync('catalog-harvester/component-compatibility-sources.json', 'utf8'));

const sourceFor = (brand) => registry.sources.find((source) => (source.brands ?? []).some((candidate) => candidate.toLocaleLowerCase() === brand.toLocaleLowerCase()));

for (const brand of ['Shimano', 'SRAM', 'microSHIFT', 'Campagnolo']) {
  test(`${brand} compatibility source is official HTTPS and explicitly allowlisted`, () => {
    const source = sourceFor(brand);
    assert.ok(source, `${brand} source missing`);
    assert.match(source.index_url, /^https:\/\//u);
    assert.ok(Array.isArray(source.official_hosts) && source.official_hosts.length > 0);
    const indexHost = new URL(source.index_url).hostname;
    assert.ok(source.official_hosts.some((host) => indexHost === host || indexHost.endsWith(`.${host}`)), `${brand} index host is outside official_hosts`);
  });
}

test('compatibility source registry never points at retailers forums or search engines', () => {
  const forbidden = /amazon|ebay|reddit|forum|google\.|bing\.|yandex|bike24|chainreaction|competitivecyclist|jensonusa/iu;
  for (const source of registry.sources) {
    assert.doesNotMatch(source.index_url, forbidden);
    if (source.service_search_url) assert.doesNotMatch(source.service_search_url, forbidden);
  }
});
