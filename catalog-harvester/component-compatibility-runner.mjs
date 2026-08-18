import { materializeCampagnoloCassetteCompatibility } from './campagnolo-compatibility-core.mjs';
import { materializeMicroshiftCassetteCompatibility } from './microshift-compatibility-core.mjs';
import {
  materializeShimano8SpeedRdTo7SpeedCassettes,
  materializeShimanoMatrixAgainstComponents,
  parseShimanoRearDerailleurCassetteMatrix,
} from './shimano-compatibility-core.mjs';
import { materializeSramEagleTransmissionCompatibility } from './sram-transmission-compatibility-core.mjs';

const SHIMANO_C254 = 'https://productinfo.shimano.com/en/compatibility/C-254';
const SHIMANO_C433 = 'https://productinfo.shimano.com/en/compatibility/C-433';
const SRAM_EAGLE_TRANSMISSION_RULE = 'https://www.sram.com/en/learn/eagle-transmission-welcome-guide/easy-maintenance';
const MICROSHIFT_FAQ = 'https://www.microshift.com/faqs/';
const CAMPAGNOLO_FAMILY_URLS = {
  ekar: 'https://www.campagnolo.com/us-en/ekar-rear-derailleur/CRDEKAR1X13S.html',
  'ekar-gt': 'https://www.campagnolo.com/gb-en/ekar-gt-rear-derailleur/CRDEKAR1X13SGT.html',
  'super-record-wireless-12': 'https://www.campagnolo.com/gb-en/super-record-wireless-rear-derailleur/CRDSUPERRECORDWRLDB12S.html',
};
const DEFAULT_TIMEOUT_MS = 20_000;

const exactRdPart = (value) => String(value ?? '').toUpperCase().match(/\bRD-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/u)?.[0] ?? null;
const SHIMANO_MTB_LIFESTYLE_RD = /^RD-(?:M|U|TX|TY|FT|TZ)[A-Z0-9-]*$/u;

function supportsShimanoC433(entry, componentRegistry) {
  if (String(entry?.brand ?? '').toLocaleLowerCase() !== 'shimano') return false;
  if (entry?.category !== 'rear_derailleur') return false;
  const component = componentRegistry.find((item) => item.id === entry.component_id);
  const part = exactRdPart(`${entry.model ?? ''} ${component?.model ?? ''} ${component?.display_name ?? ''} ${entry.component_id ?? ''}`);
  return Number(component?.specs?.speeds) === 8 && Boolean(part && SHIMANO_MTB_LIFESTYLE_RD.test(part));
}

function supportsShimanoC254(entry) {
  if (String(entry?.brand ?? '').toLocaleLowerCase() !== 'shimano') return false;
  if (entry?.category !== 'rear_derailleur') return false;
  const part = exactRdPart(`${entry.model ?? ''} ${entry.component_id ?? ''}`);
  return Boolean(part && /^RD-(?:R\d|RX|U5000)/u.test(part));
}

function supportsSramEagleTransmission(entry, componentRegistry) {
  if (String(entry?.brand ?? '').toLocaleLowerCase() !== 'sram') return false;
  if (entry?.category !== 'rear_derailleur') return false;
  const component = componentRegistry.find((item) => item.id === entry.component_id);
  if (!component) return false;
  const text = `${component.model ?? ''} ${component.display_name ?? ''} ${component.specs?.system ?? ''} ${component.specs?.chain_technology ?? ''}`;
  if (/\bDH\s+Transmission\b/iu.test(text)) return false;
  return /\bEagle\s+Transmission\b/iu.test(text)
    || (/\bT-Type\b/iu.test(text) && /\bTransmission\b/iu.test(text));
}

function supportsMicroshiftRange(entry, componentRegistry) {
  if (String(entry?.brand ?? '').toLocaleLowerCase().replace(/\s+/gu, '') !== 'microshift') return false;
  if (entry?.category !== 'rear_derailleur') return false;
  const component = componentRegistry.find((item) => item.id === entry.component_id);
  if (!component) return false;
  const text = `${entry.model ?? ''} ${component.model ?? ''} ${component.display_name ?? ''}`;
  return /\bADVENT\s*X\b|\bACOLYTE\b|\bADVENT\b/iu.test(text);
}

function campagnoloFamily(entry, componentRegistry) {
  if (String(entry?.brand ?? '').toLocaleLowerCase() !== 'campagnolo') return null;
  if (entry?.category !== 'rear_derailleur') return null;
  const component = componentRegistry.find((item) => item.id === entry.component_id);
  if (!component) return null;
  const text = `${entry.model ?? ''} ${component.model ?? ''} ${component.display_name ?? ''}`;
  const speeds = Number(component?.specs?.speeds);
  if (speeds === 13 && /\bEkar\s+GT\b/iu.test(text)) return 'ekar-gt';
  if (speeds === 13 && /\bEkar\b/iu.test(text) && !/\bEkar\s+GT\b/iu.test(text)) return 'ekar';
  if (speeds === 12 && /\bSuper\s+Record\b[\s\S]*\bWireless\b|\bWireless\b[\s\S]*\bSuper\s+Record\b/iu.test(text)) return 'super-record-wireless-12';
  return null;
}

async function fetchText(url, { fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: {
        'user-agent': 'VeloQuestCatalogHarvester/1.0 (+compatibility research; evidence-first)',
        accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response?.ok) throw new Error(`HTTP ${response?.status ?? 'unknown'}`);
    return await response.text();
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`request timeout after ${timeoutMs}ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function runComponentCompatibilityManifest({
  manifest,
  componentRegistry,
  fetchImpl = globalThis.fetch,
  checkedAt = new Date().toISOString().slice(0, 10),
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  if (!Array.isArray(manifest?.entries)) throw new Error('component compatibility manifest must contain entries[]');
  if (!Array.isArray(componentRegistry)) throw new Error('componentRegistry must be an array');
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(checkedAt)) throw new Error('checkedAt must be YYYY-MM-DD');
  if (!Number.isFinite(Number(timeoutMs)) || Number(timeoutMs) < 1 || Number(timeoutMs) > 60_000) throw new Error('timeoutMs must be 1..60000');

  const c433Entries = manifest.entries.filter((entry) => supportsShimanoC433(entry, componentRegistry));
  const c254Entries = manifest.entries.filter((entry) => supportsShimanoC254(entry) && !supportsShimanoC433(entry, componentRegistry));
  const sramTransmissionEntries = manifest.entries.filter((entry) => supportsSramEagleTransmission(entry, componentRegistry));
  const microshiftEntries = manifest.entries.filter((entry) => supportsMicroshiftRange(entry, componentRegistry));
  const campagnoloFamilies = [...new Set(manifest.entries.map((entry) => campagnoloFamily(entry, componentRegistry)).filter(Boolean))].sort();

  let c433;
  let c433Error;
  if (c433Entries.length > 0) {
    try {
      const html = await fetchText(SHIMANO_C433, { fetchImpl, timeoutMs: Number(timeoutMs) });
      c433 = materializeShimano8SpeedRdTo7SpeedCassettes({ html, components: componentRegistry });
    } catch (error) {
      c433Error = String(error?.message ?? error);
    }
  }

  let c254;
  let c254Error;
  if (c254Entries.length > 0) {
    try {
      const html = await fetchText(SHIMANO_C254, { fetchImpl, timeoutMs: Number(timeoutMs) });
      c254 = materializeShimanoMatrixAgainstComponents({
        matrix: parseShimanoRearDerailleurCassetteMatrix(html),
        components: componentRegistry,
      });
    } catch (error) {
      c254Error = String(error?.message ?? error);
    }
  }

  let sramTransmission;
  let sramTransmissionError;
  if (sramTransmissionEntries.length > 0) {
    try {
      const html = await fetchText(SRAM_EAGLE_TRANSMISSION_RULE, { fetchImpl, timeoutMs: Number(timeoutMs) });
      sramTransmission = materializeSramEagleTransmissionCompatibility({ html, components: componentRegistry });
    } catch (error) {
      sramTransmissionError = String(error?.message ?? error);
    }
  }

  let microshift;
  let microshiftError;
  if (microshiftEntries.length > 0) {
    try {
      const html = await fetchText(MICROSHIFT_FAQ, { fetchImpl, timeoutMs: Number(timeoutMs) });
      microshift = materializeMicroshiftCassetteCompatibility({ html, components: componentRegistry });
    } catch (error) {
      microshiftError = String(error?.message ?? error);
    }
  }

  const campagnoloByFamily = new Map();
  const campagnoloErrorByFamily = new Map();
  for (const family of campagnoloFamilies) {
    const url = CAMPAGNOLO_FAMILY_URLS[family];
    try {
      const html = await fetchText(url, { fetchImpl, timeoutMs: Number(timeoutMs) });
      campagnoloByFamily.set(family, materializeCampagnoloCassetteCompatibility({ html, components: componentRegistry, family }));
    } catch (error) {
      campagnoloErrorByFamily.set(family, String(error?.message ?? error));
    }
  }

  const entries = manifest.entries.map((entry) => {
    const base = {
      component_id: entry.component_id,
      brand: entry.brand,
      model: entry.model,
      category: entry.category,
      impact_bikes: Number(entry.impact_bikes) || 0,
      bike_ids: Array.isArray(entry.bike_ids) ? [...entry.bike_ids].sort() : [],
      checked_at: checkedAt,
    };

    if (supportsShimanoC433(entry, componentRegistry)) {
      if (c433Error) return { ...base, status: 'fetch_error', evidence_url: SHIMANO_C433, error: c433Error };
      const pairs = (c433?.pairs ?? []).filter((pair) => pair.source_component_id === entry.component_id);
      if (pairs.length === 0) {
        const relevant = (c433?.unresolved ?? []).find((item) => item.source_component_id === entry.component_id);
        return { ...base, status: 'no_exact_pairs', evidence_url: SHIMANO_C433, error: relevant?.reason ?? 'official C-433 statement produced no exact registered target pair', unresolved: relevant ? [relevant] : [] };
      }
      return { ...base, status: 'resolved', evidence_url: SHIMANO_C433, pairs };
    }

    if (supportsSramEagleTransmission(entry, componentRegistry)) {
      if (sramTransmissionError) return { ...base, status: 'fetch_error', evidence_url: SRAM_EAGLE_TRANSMISSION_RULE, error: sramTransmissionError };
      const pairs = (sramTransmission?.pairs ?? []).filter((pair) => pair.source_component_id === entry.component_id);
      if (pairs.length === 0) {
        const relevant = (sramTransmission?.unresolved ?? []).find((item) => item.source_component_id === entry.component_id) ?? (sramTransmission?.unresolved ?? [])[0];
        return { ...base, status: 'no_exact_pairs', evidence_url: SRAM_EAGLE_TRANSMISSION_RULE, error: relevant?.reason ?? 'official SRAM Eagle Transmission rule produced no exact registered target pair', unresolved: relevant ? [relevant] : [] };
      }
      return { ...base, status: 'resolved', evidence_url: SRAM_EAGLE_TRANSMISSION_RULE, pairs };
    }

    if (supportsMicroshiftRange(entry, componentRegistry)) {
      if (microshiftError) return { ...base, status: 'fetch_error', evidence_url: MICROSHIFT_FAQ, error: microshiftError };
      const pairs = (microshift?.pairs ?? []).filter((pair) => pair.source_component_id === entry.component_id);
      if (pairs.length === 0) {
        const relevant = (microshift?.unresolved ?? []).find((item) => item.source_component_id === entry.component_id);
        return { ...base, status: 'no_exact_pairs', evidence_url: MICROSHIFT_FAQ, error: relevant?.reason ?? 'official microSHIFT FAQ produced no exact registered target cassette pair', unresolved: relevant ? [relevant] : [] };
      }
      return { ...base, status: 'resolved', evidence_url: MICROSHIFT_FAQ, pairs };
    }

    const campyFamily = campagnoloFamily(entry, componentRegistry);
    if (campyFamily) {
      const evidenceUrl = CAMPAGNOLO_FAMILY_URLS[campyFamily];
      const error = campagnoloErrorByFamily.get(campyFamily);
      if (error) return { ...base, status: 'fetch_error', evidence_url: evidenceUrl, error };
      const result = campagnoloByFamily.get(campyFamily);
      const pairs = (result?.pairs ?? []).filter((pair) => pair.source_component_id === entry.component_id);
      if (pairs.length === 0) {
        const relevant = (result?.unresolved ?? [])[0];
        return { ...base, status: 'no_exact_pairs', evidence_url: evidenceUrl, error: relevant?.reason ?? `official Campagnolo ${campyFamily} page produced no exact registered target cassette pair`, unresolved: relevant ? [relevant] : [] };
      }
      return { ...base, status: 'resolved', evidence_url: evidenceUrl, pairs };
    }

    if (!supportsShimanoC254(entry)) {
      return { ...base, status: 'unsupported_adapter', error: 'no strict automated adapter for this component/source yet' };
    }
    if (c254Error) return { ...base, status: 'fetch_error', evidence_url: SHIMANO_C254, error: c254Error };
    const pairs = (c254?.pairs ?? []).filter((pair) => pair.source_component_id === entry.component_id);
    if (pairs.length === 0) {
      const relevantUnresolved = (c254?.unresolved ?? []).filter((item) => item.source_component_id === entry.component_id || exactRdPart(`${entry.model ?? ''} ${entry.component_id ?? ''}`) === item.source_part_number);
      return { ...base, status: 'no_exact_pairs', evidence_url: SHIMANO_C254, error: relevantUnresolved[0]?.reason ?? 'official matrix produced no exact registered target pair', unresolved: relevantUnresolved };
    }
    return { ...base, status: 'resolved', evidence_url: SHIMANO_C254, pairs };
  });

  const statuses = ['resolved', 'unsupported_adapter', 'no_exact_pairs', 'fetch_error'];
  return {
    schema_version: 1,
    generated_at: checkedAt,
    entries,
    summary: Object.fromEntries(statuses.map((status) => [status, entries.filter((entry) => entry.status === status).length])),
  };
}
