import { parse } from 'csv-parse/sync';
import { transaction } from '../db/database.js';
import { upsertResourceByName } from '../repositories/resourceRepository.js';
import { upsertProgramByName } from '../repositories/programRepository.js';

const VALID_REGIONS = new Set(['India', 'USA', 'Europe']);

function parseRows(csvText) {
  if (!csvText?.trim()) return [];
  return parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function pick(row, names) {
  const key = Object.keys(row).find((candidate) => names.map((name) => name.toLowerCase()).includes(candidate.trim().toLowerCase()));
  return key ? row[key] : '';
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeRegion(value) {
  const normalized = normalizeName(value);
  const match = [...VALID_REGIONS].find((region) => region.toLowerCase() === normalized.toLowerCase());
  return match || 'Unknown';
}

export function importResources(csvText) {
  const rows = parseRows(csvText);
  const seen = new Set();
  const skipped = [];

  return transaction(() => {
    const resources = [];
    for (const [index, row] of rows.entries()) {
      const name = normalizeName(pick(row, ['Resource Name', 'name', 'Resource']));
      if (!name) {
        skipped.push({ row: index + 2, reason: 'Missing Resource Name' });
        continue;
      }
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      resources.push(upsertResourceByName({
        name,
        region: normalizeRegion(pick(row, ['Region', 'resource_region'])),
        updateExisting: true,
      }));
    }
    return { imported: resources.length, skipped, resources };
  });
}

export function importPrograms(csvText) {
  const rows = parseRows(csvText);
  const seen = new Set();
  const skipped = [];

  return transaction(() => {
    const programs = [];
    for (const [index, row] of rows.entries()) {
      const name = normalizeName(pick(row, ['Program Name', 'Program', 'Area']));
      if (!name) {
        skipped.push({ row: index + 2, reason: 'Missing Program Name' });
        continue;
      }
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      programs.push(upsertProgramByName({
        name,
        tenrox_code: normalizeName(pick(row, ['Tenrox Code', 'Tenrox', 'tenrox_code'])) || 'N/A',
        updateExisting: true,
      }));
    }
    return { imported: programs.length, skipped, programs };
  });
}
