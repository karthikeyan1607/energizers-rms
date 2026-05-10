import { parse } from 'csv-parse/sync';
import { clearAcceptedPreviewImports, clearPreviewImports, insertImportRow, listImports } from '../repositories/importRepository.js';
import { getResourceByName, upsertResourceByName } from '../repositories/resourceRepository.js';
import { getProgramByName, getProgramByTenroxCode, upsertProgramByName } from '../repositories/programRepository.js';
import { createValidatedAllocation } from './allocationService.js';
import { getCapacityContext } from './capacityService.js';
import { transaction } from '../db/database.js';
import { round2, round4 } from '../utils/precision.js';

function pick(row, names) {
  const key = Object.keys(row).find((candidate) => names.map((name) => name.toLowerCase()).includes(candidate.trim().toLowerCase()));
  return key ? row[key] : '';
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function resolveProgramName(rawProgram, tenroxCode) {
  const normalizedProgram = normalizeName(rawProgram);
  const normalizedTenrox = normalizeName(tenroxCode);
  const byName = normalizedProgram ? getProgramByName(normalizedProgram) : null;
  if (byName) return byName.name;
  const byTenrox = normalizedTenrox && normalizedTenrox !== 'N/A' ? getProgramByTenroxCode(normalizedTenrox) : null;
  if (byTenrox) return byTenrox.name;
  return 'Unknown';
}

export function parseImportRows({ csvText, rows }) {
  if (rows?.length) return rows;
  if (!csvText?.trim()) return [];
  return parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

export function previewImport({ csvText, rows }) {
  const { monthlyHours } = getCapacityContext();
  const parsed = parseImportRows({ csvText, rows });
  clearPreviewImports();

  return transaction(() => parsed.flatMap((row) => {
    const assignedTo = normalizeName(pick(row, ['Assigned To', 'assigned_to', 'AssignedTo']));
    const storyPoints = Number(pick(row, ['Story Points', 'story_points', 'StoryPoints']));
    const program = normalizeName(pick(row, ['Program', 'Program / Area', 'Area', 'program']));
    const tenroxCode = normalizeName(pick(row, ['Tenrox Project ID', 'Tenrox Code', 'tenrox_code', 'TenroxCode'])) || 'N/A';
    const iteration = normalizeName(pick(row, ['Iteration', 'iteration']));

    if (!assignedTo || !Number.isFinite(storyPoints) || storyPoints <= 0) {
      return [];
    }

    const allocation = round4(storyPoints * 0.1);
    const hours = round2(allocation * monthlyHours);

    const warnings = [];
    const resolvedProgram = resolveProgramName(program, tenroxCode);
    if (resolvedProgram === 'Unknown') warnings.push('Program could not be mapped from Program or Tenrox Code.');

    const saved = insertImportRow({
      assigned_to: assignedTo,
      story_points: storyPoints,
      program: resolvedProgram,
      tenrox_code: tenroxCode,
      iteration,
      hours,
    });

    return { ...saved, allocation_percentage: allocation, warnings };
  }));
}

export function commitImport(edits = []) {
  const previewRows = listImports('preview');

  return transaction(() => {
    const allocations = [];
    for (const preview of previewRows) {
      const assignedTo = preview.assigned_to;
      const programName = preview.program;
      const storyPoints = Number(preview.story_points);

      const existingResource = getResourceByName(assignedTo);
      const resource = existingResource || upsertResourceByName({ name: assignedTo, region: 'Unknown', updateExisting: false });
      const program = upsertProgramByName({ name: programName, tenrox_code: preview.tenrox_code || 'N/A', updateExisting: true });

      allocations.push(createValidatedAllocation({
        resource_id: resource.id,
        program_id: program.id,
        story_points: storyPoints,
        source: 'import',
      }));
    }
    clearAcceptedPreviewImports();
    return allocations;
  });
}

export function getImportPreview() {
  return listImports('preview');
}
