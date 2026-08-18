const cleanText = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/giu, ' ')
  .replace(/&amp;/giu, '&')
  .replace(/&#10004;|&#x2714;|&check;|&checkmark;/giu, '✔')
  .replace(/<[^>]+>/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

const exactPart = (value) => String(value ?? '').toUpperCase().match(/\bRD-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/u)?.[0] ?? null;
const exactRange = (value) => String(value ?? '').toUpperCase().match(/\b\d{1,2}-\d{1,2}T\b/u)?.[0] ?? null;

function tableRows(tableHtml) {
  const rows = [];
  for (const rowMatch of String(tableHtml ?? '').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)) {
    const cells = [...rowMatch[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/giu)]
      .map((match) => cleanText(match[1]));
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

function sections(html) {
  const source = String(html ?? '');
  const markers = [...source.matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/giu)];
  const result = [];
  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const title = cleanText(marker[1]);
    const speed = Number(title.match(/\b(7|8|9|10|11|12)-speed\b/iu)?.[1]);
    if (!Number.isInteger(speed)) continue;
    const start = marker.index + marker[0].length;
    const end = markers[index + 1]?.index ?? source.length;
    result.push({ title, speed, html: source.slice(start, end) });
  }
  return result;
}

function verdict(cell) {
  const normalized = cleanText(cell);
  if (normalized === '✔' || /^(?:yes|compatible)$/iu.test(normalized)) return 'compatible';
  if (/^(?:-|–|—|−)$/u.test(normalized)) return 'incompatible';
  return null;
}

export function parseShimanoRearDerailleurCassetteMatrix(html) {
  const rules = [];
  const unresolved = [];
  for (const section of sections(html)) {
    for (const tableMatch of section.html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/giu)) {
      const rows = tableRows(tableMatch[0]);
      const headerIndex = rows.findIndex((row) => row.some((cell) => exactPart(cell)));
      if (headerIndex < 0) continue;
      const header = rows[headerIndex];
      const columns = header.map((cell, index) => ({ index, part_number: exactPart(cell) })).filter((item) => item.part_number);
      if (columns.length === 0) continue;

      for (const row of rows.slice(headerIndex + 1)) {
        const range = exactRange(row[0]);
        if (!range) continue;
        for (const column of columns) {
          if (column.index >= row.length) {
            unresolved.push({ section: section.title, speed: section.speed, range, part_number: column.part_number, reason: 'matrix column missing from data row' });
            continue;
          }
          const status = verdict(row[column.index]);
          if (!status) {
            unresolved.push({ section: section.title, speed: section.speed, range, part_number: column.part_number, cell: row[column.index], reason: 'non-binary matrix cell' });
            continue;
          }
          rules.push({
            source_part_number: column.part_number,
            target_category: 'cassette',
            target_range: range,
            speeds: section.speed,
            status,
            section: section.title,
          });
        }
      }
    }
  }
  return { rules, unresolved };
}

export function materializeShimanoMatrixAgainstComponents({ matrix, components }) {
  const componentRows = Array.isArray(components) ? components : [];
  const sourceByPart = new Map();
  for (const component of componentRows) {
    if (String(component?.brand ?? '').toLocaleLowerCase() !== 'shimano') continue;
    const part = exactPart(`${component.model ?? ''} ${component.display_name ?? ''}`);
    if (!part) continue;
    if (!sourceByPart.has(part)) sourceByPart.set(part, []);
    sourceByPart.get(part).push(component);
  }

  const pairs = [];
  const unresolved = [...(matrix?.unresolved ?? [])];
  for (const rule of matrix?.rules ?? []) {
    const sources = (sourceByPart.get(rule.source_part_number) ?? []).filter((component) => component.category === 'rear_derailleur');
    if (sources.length !== 1) {
      unresolved.push({ ...rule, reason: sources.length === 0 ? 'source component not registered' : 'source component identity is not unique' });
      continue;
    }
    const targets = componentRows.filter((component) => {
      if (component.category !== 'cassette') return false;
      if (String(component.brand ?? '').toLocaleLowerCase() !== 'shimano') return false;
      const speed = Number(component?.specs?.speeds);
      const range = exactRange(`${component?.specs?.range ?? ''} ${component.model ?? ''} ${component.display_name ?? ''}`);
      return speed === rule.speeds && range === rule.target_range;
    });
    if (targets.length === 0) {
      unresolved.push({ ...rule, source_component_id: sources[0].id, reason: 'no exact Shimano cassette target registered for speed/range' });
      continue;
    }
    for (const target of targets) {
      pairs.push({
        source_component_id: sources[0].id,
        target_component_id: target.id,
        status: rule.status,
        rule_summary: `Shimano compatibility matrix ${rule.section} marks ${rule.source_part_number} ${rule.status} with ${rule.speeds}-speed ${rule.target_range} cassette gearing.`,
        source_part_number: rule.source_part_number,
        target_range: rule.target_range,
        speeds: rule.speeds,
      });
    }
  }

  const deduped = [...new Map(pairs.map((pair) => [`${pair.source_component_id}|${pair.target_component_id}`, pair])).values()]
    .sort((a, b) => a.source_component_id.localeCompare(b.source_component_id) || a.target_component_id.localeCompare(b.target_component_id));
  return { pairs: deduped, unresolved };
}

export function materializeShimano8SpeedRdTo7SpeedCassettes({ html, components }) {
  const statement = cleanText(html);
  const explicit = /rear derailleur[^.]{0,120}8-speed[^.]{0,120}(?:can also be used|compatible)[^.]{0,120}7-speed drivetrain/iu.test(statement);
  if (!explicit) {
    return { pairs: [], unresolved: [{ reason: 'C-433 explicit 8-speed RD to 7-speed drivetrain statement not found' }] };
  }

  const componentRows = Array.isArray(components) ? components : [];
  const targets = componentRows.filter((component) =>
    String(component?.brand ?? '').toLocaleLowerCase() === 'shimano'
    && component?.category === 'cassette'
    && Number(component?.specs?.speeds) === 7
    && /^https:\/\/productinfo\.shimano\.com\//iu.test(String(component?.evidence_url ?? ''))
  );

  const pairs = [];
  const unresolved = [];
  for (const source of componentRows) {
    if (String(source?.brand ?? '').toLocaleLowerCase() !== 'shimano') continue;
    if (source?.category !== 'rear_derailleur' || Number(source?.specs?.speeds) !== 8) continue;
    const part = exactPart(`${source.model ?? ''} ${source.display_name ?? ''}`);
    if (!part) {
      unresolved.push({ source_component_id: source.id, reason: '8-speed Shimano RD has no exact RD part number' });
      continue;
    }
    if (targets.length === 0) {
      unresolved.push({ source_component_id: source.id, source_part_number: part, reason: 'no exact official Shimano 7-speed cassette target registered' });
      continue;
    }
    for (const target of targets) {
      pairs.push({
        source_component_id: source.id,
        target_component_id: target.id,
        status: 'compatible',
        rule_summary: `Shimano C-433 states that the 8-speed rear derailleur can also be used for a 7-speed drivetrain; ${part} is registered as an exact 8-speed Shimano RD and ${target.id} as an official Shimano 7-speed cassette.`,
        source_part_number: part,
        speeds: 7,
      });
    }
  }
  return { pairs, unresolved };
}
