const STORAGE_KEY = 'energizers-rms-state-v1';
const SNAPSHOT_PREFIX = 'snapshot_';
const DEFAULT_MONTH_INDEX = 4;
const DEFAULT_YEAR = 2026;

function makeId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function round4(value) {
  return Math.round((Number(value) || 0) * 10000) / 10000;
}

export function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeMatch(value) {
  return normalizeName(value).toLowerCase();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function firstNameOnly(value) {
  return normalizeName(value).split(' ')[0] || '';
}

function mergeStoryTitles(...values) {
  const titles = values
    .flatMap((value) => String(value || '').split(' | '))
    .map((value) => normalizeName(value))
    .filter(Boolean);
  return [...new Set(titles)].join(' | ');
}

function parseAssignedTo(value) {
  const raw = normalizeName(value);
  const emailMatch = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const email = normalizeEmail(emailMatch?.[0] || '');
  const name = normalizeName(raw.replace(/[<\[\(]?[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}[>\]\)]?/gi, ''));
  return {
    raw,
    email,
    name,
  };
}

export function normalizeTenrox(value) {
  const normalized = normalizeName(value);
  return normalized || 'N/A';
}

export function normalizeRegion(value) {
  const normalized = normalizeMatch(value);
  if (normalized === 'india') return 'India';
  if (normalized === 'usa' || normalized === 'us' || normalized === 'united states') return 'USA';
  if (normalized === 'europe' || normalized === 'eu') return 'Europe';
  return 'Unknown';
}

function defaultState() {
  return {
    resources: [],
    programs: [],
    allocations: [],
    previewRows: [],
    config: {
      id: 'config',
      total_resources: '',
      monthly_hours: '',
      selected_month: DEFAULT_MONTH_INDEX,
      selected_year: DEFAULT_YEAR,
    },
  };
}

export function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      config: { ...defaultState().config, ...(parsed.config || {}) },
      resources: Array.isArray(parsed.resources) ? parsed.resources : [],
      programs: Array.isArray(parsed.programs) ? parsed.programs : [],
      allocations: Array.isArray(parsed.allocations) ? parsed.allocations : [],
      previewRows: Array.isArray(parsed.previewRows) ? parsed.previewRows : [],
    };
  } catch {
    return defaultState();
  }
}

export function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

function snapshotKey(monthIndex, year) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${SNAPSHOT_PREFIX}${monthNames[Number(monthIndex) || 0]}_${year}`;
}

function findResourceByName(state, name) {
  const lookup = normalizeMatch(name);
  return state.resources.find((resource) => normalizeMatch(resource.name) === lookup) || null;
}

function findResourceByEmail(state, email) {
  const lookup = normalizeEmail(email);
  if (!lookup) return null;
  return state.resources.find((resource) => normalizeEmail(resource.email) === lookup) || null;
}

function findResourceForAssignedTo(state, assignedToValue) {
  const parsed = parseAssignedTo(assignedToValue);
  return findResourceByEmail(state, parsed.email) || findResourceByName(state, parsed.name || parsed.raw) || null;
}

function findProgramByName(state, name) {
  const lookup = normalizeMatch(name);
  return state.programs.find((program) => normalizeMatch(program.name) === lookup) || null;
}

function findProgramByTenrox(state, tenroxCode) {
  const lookup = normalizeTenrox(tenroxCode).toLowerCase();
  return state.programs.find((program) => normalizeTenrox(program.tenrox_code).toLowerCase() === lookup) || null;
}

function sortResources(resources) {
  return [...resources].sort((left, right) => left.name.localeCompare(right.name));
}

function sortPrograms(programs) {
  return [...programs].sort((left, right) => {
    const nameComparison = left.name.localeCompare(right.name);
    if (nameComparison !== 0) return nameComparison;
    return normalizeTenrox(left.tenrox_code).localeCompare(normalizeTenrox(right.tenrox_code));
  });
}

function computeAllocation(storyPoints) {
  return round4((Number(storyPoints) || 0) * 0.1);
}

function computeHours(storyPoints, monthlyHours) {
  return round2(computeAllocation(storyPoints) * (Number(monthlyHours) || 0));
}

function formatAllocationSummaryValue(value) {
  return Number(round4(value).toFixed(2)).toString();
}

function ensureResourceCapacity(state, resourceId, nextAllocations, excludedAllocationId = null) {
  const resource = state.resources.find((item) => item.id === resourceId);
  const maxCapacity = Number.isFinite(Number(resource?.max_capacity)) ? Number(resource.max_capacity) : 1;
  const totalAllocation = nextAllocations
    .filter((allocation) => allocation.resource_id === resourceId && allocation.id !== excludedAllocationId)
    .reduce((sum, allocation) => sum + computeAllocation(allocation.story_points), 0);

  if (round4(totalAllocation) > round4(maxCapacity)) {
    throw new Error(`${resource?.name || 'Resource'} exceeds maximum capacity of ${formatAllocationSummaryValue(maxCapacity)}.`);
  }
}

function ensureNoOrphans(state, resourceId, programId) {
  if (!state.resources.some((resource) => resource.id === resourceId)) {
    throw new Error('Resource must exist before allocation.');
  }
  if (!state.programs.some((program) => program.id === programId)) {
    throw new Error('Program must exist before allocation.');
  }
}

function upsertResourceRecord(state, { name, email, region, max_capacity = 1 }, { updateExisting = true } = {}) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) throw new Error('Resource name is required.');
  const normalizedEmail = normalizeEmail(email);
  const normalizedRegion = normalizeRegion(region);
  const existing = findResourceByEmail(state, normalizedEmail) || findResourceByName(state, normalizedName);

  if (existing) {
    if (updateExisting) {
      existing.name = normalizedName;
      existing.email = normalizedEmail;
      existing.region = normalizedRegion;
      existing.max_capacity = max_capacity;
    }
    return existing;
  }

  const resource = {
    id: makeId('resource'),
    name: normalizedName,
    email: normalizedEmail,
    region: normalizedRegion,
    max_capacity,
  };
  state.resources.push(resource);
  return resource;
}

function upsertProgramRecord(state, { name, tenrox_code }, { updateExisting = true, allowUnknownComposite = false } = {}) {
  const normalizedName = normalizeName(name);
  const normalizedTenrox = normalizeTenrox(tenrox_code);
  if (!normalizedName) throw new Error('Program name is required.');

  let existing = findProgramByName(state, normalizedName);
  if (
    allowUnknownComposite &&
    normalizedName === 'Unknown' &&
    normalizedTenrox !== 'N/A'
  ) {
    existing = state.programs.find((program) => program.name === 'Unknown' && normalizeTenrox(program.tenrox_code) === normalizedTenrox) || existing;
  }

  if (existing) {
    if (updateExisting) {
      existing.name = normalizedName;
      existing.tenrox_code = normalizedTenrox;
    }
    return existing;
  }

  const program = {
    id: makeId('program'),
    name: normalizedName,
    tenrox_code: normalizedTenrox,
  };
  state.programs.push(program);
  return program;
}

function resolveProgramForImport(state, rawProgram, rawTenroxCode) {
  const normalizedProgram = normalizeName(rawProgram);
  const normalizedTenrox = normalizeTenrox(rawTenroxCode);
  const byName = normalizedProgram ? findProgramByName(state, normalizedProgram) : null;
  if (byName) {
    return { name: byName.name, tenrox_code: normalizeTenrox(byName.tenrox_code || normalizedTenrox) };
  }
  const byTenrox = normalizedTenrox !== 'N/A' ? findProgramByTenrox(state, normalizedTenrox) : null;
  if (byTenrox) {
    return { name: byTenrox.name, tenrox_code: normalizeTenrox(byTenrox.tenrox_code) };
  }
  return { name: 'Unknown', tenrox_code: normalizedTenrox };
}

function createResolvedAllocation(state, allocation) {
  const resource = state.resources.find((item) => item.id === allocation.resource_id);
  const program = state.programs.find((item) => item.id === allocation.program_id);
  const monthlyHours = Number(state.config.monthly_hours) || 0;
  const allocationPercentage = computeAllocation(allocation.story_points);

  return {
    ...allocation,
    resource_name: resource?.name || 'Unknown',
    region: resource?.region || 'Unknown',
    program_name: program?.name || 'Unknown',
    tenrox_code: normalizeTenrox(program?.tenrox_code),
    user_story_title: normalizeName(allocation.user_story_title),
    allocation_percentage: allocationPercentage,
    hours: round2(allocationPercentage * monthlyHours),
  };
}

function generateProgramResourceSummary(programId, allocations) {
  return allocations
    .filter((allocation) => allocation.program_id === programId)
    .sort((left, right) => right.allocation_percentage - left.allocation_percentage || left.resource_name.localeCompare(right.resource_name))
    .map((allocation) => `${firstNameOnly(allocation.resource_name)} (${formatAllocationSummaryValue(allocation.allocation_percentage)})`)
    .join(', ');
}

export function buildDashboard(state) {
  const monthlyHours = Number(state.config.monthly_hours) || 0;
  const totalResources = Number(state.config.total_resources) || 0;
  const allocations = state.allocations.map((allocation) => createResolvedAllocation(state, allocation));
  const usedCapacity = round4(allocations.reduce((sum, allocation) => sum + allocation.allocation_percentage, 0));
  const remainingCapacity = round4(totalResources - usedCapacity);

  const resourceUtilization = sortResources(state.resources).map((resource) => {
    const resourceAllocations = allocations.filter((allocation) => allocation.resource_id === resource.id);
    const totalAllocation = round4(resourceAllocations.reduce((sum, allocation) => sum + allocation.allocation_percentage, 0));
    const maxCapacity = Number.isFinite(Number(resource.max_capacity)) ? Number(resource.max_capacity) : 1;
    return {
      ...resource,
      allocation_percentage: totalAllocation,
      remaining_capacity: round4(Math.max(0, maxCapacity - totalAllocation)),
      allocated_hours: round2(totalAllocation * monthlyHours),
      allocations: resourceAllocations,
    };
  });

  const programSummary = sortPrograms(state.programs).map((program) => {
    const programAllocations = allocations.filter((allocation) => allocation.program_id === program.id);
    const regionTotal = (region) => round4(
      programAllocations
        .filter((allocation) => allocation.region === region)
        .reduce((sum, allocation) => sum + allocation.allocation_percentage, 0),
    );
    const totalProgramResources = round4(programAllocations.reduce((sum, allocation) => sum + allocation.allocation_percentage, 0));
    return {
      ...program,
      india_resources: regionTotal('India'),
      usa_resources: regionTotal('USA'),
      europe_resources: regionTotal('Europe'),
      total_program_resources: totalProgramResources,
      percent_of_total_resources: totalResources > 0 ? round4(totalProgramResources / totalResources) : 0,
      no_of_resources: totalProgramResources,
      forecast_hours: round2(totalProgramResources * monthlyHours),
      resource_allocation_summary: generateProgramResourceSummary(program.id, allocations),
    };
  });

  return {
    planning_period: {
      total_hours: monthlyHours,
    },
    config: state.config,
    totals: {
      total_resources: totalResources,
      monthly_hours: monthlyHours,
      total_capacity_hours: round2(totalResources * monthlyHours),
      used_capacity: usedCapacity,
      used_capacity_hours: round2(usedCapacity * monthlyHours),
      remaining_capacity: remainingCapacity,
      remaining_capacity_hours: round2(remainingCapacity * monthlyHours),
    },
    resource_utilization: resourceUtilization,
    program_summary: programSummary,
    allocations,
  };
}

export function importResourcesRows(state, rows) {
  const previousResources = state.resources;
  const nextResources = [];
  rows.forEach((row) => {
    const name = normalizeName(row['Resource Name'] ?? row.resource_name ?? row.ResourceName ?? row.name);
    if (!name) return;
    const email = normalizeEmail(row.Email ?? row.email);
    const region = normalizeRegion(row.Region ?? row.region);
    const existing = (email ? previousResources.find((resource) => normalizeEmail(resource.email) === email) : null)
      || previousResources.find((resource) => normalizeMatch(resource.name) === normalizeMatch(name));
    if (nextResources.some((resource) => normalizeEmail(resource.email) === email && email)) return;
    if (nextResources.some((resource) => normalizeMatch(resource.name) === normalizeMatch(name))) return;
    nextResources.push({
      id: existing?.id || makeId('resource'),
      name,
      email,
      region,
      max_capacity: Number.isFinite(Number(existing?.max_capacity)) ? Number(existing.max_capacity) : 1,
    });
  });
  state.resources = nextResources;
  const validIds = new Set(nextResources.map((resource) => resource.id));
  state.allocations = state.allocations.filter((allocation) => validIds.has(allocation.resource_id));
  return nextResources.length;
}

export function importProgramsRows(state, rows) {
  const previousPrograms = state.programs;
  const nextPrograms = [];
  rows.forEach((row) => {
    const name = normalizeName(row['Program Name'] ?? row.program_name ?? row.ProgramName ?? row.name);
    if (!name) return;
    const tenrox_code = normalizeTenrox(row['Tenrox Code'] ?? row['Tenrox Project ID'] ?? row.tenrox_code);
    const existing = previousPrograms.find((program) => normalizeMatch(program.name) === normalizeMatch(name))
      || previousPrograms.find((program) => normalizeTenrox(program.tenrox_code) === tenrox_code);
    if (nextPrograms.some((program) => normalizeMatch(program.name) === normalizeMatch(name))) return;
    nextPrograms.push({
      id: existing?.id || makeId('program'),
      name,
      tenrox_code,
    });
  });
  state.programs = nextPrograms;
  const validIds = new Set(nextPrograms.map((program) => program.id));
  state.allocations = state.allocations.filter((allocation) => validIds.has(allocation.program_id));
  return nextPrograms.length;
}

function readAzureValue(row, aliases) {
  const keys = Object.keys(row);
  const key = keys.find((candidate) => aliases.includes(candidate.trim().toLowerCase()));
  return key ? row[key] : '';
}

export function previewAzureImport(state, rows) {
  const monthlyHours = Number(state.config.monthly_hours) || 0;
  const previewRows = rows.flatMap((row) => {
    const assignedTo = normalizeName(readAzureValue(row, ['assigned to', 'assigned_to', 'assignedto']));
    const rawStoryPoints = readAzureValue(row, ['story points', 'story_points', 'storypoints']);
    const storyPoints = Number(rawStoryPoints);
    const rawProgram = normalizeName(readAzureValue(row, ['program', 'program / area', 'area']));
    const tenroxCode = normalizeTenrox(readAzureValue(row, ['tenrox project id', 'tenrox code', 'tenroxcode', 'tenrox_project_id']));
    const userStoryTitle = normalizeName(readAzureValue(row, ['user story title', 'user_story_title', 'title']));

    if (!assignedTo || String(rawStoryPoints).trim() === '' || !Number.isFinite(storyPoints) || storyPoints <= 0) return [];

    const resolvedProgram = resolveProgramForImport(state, rawProgram, tenroxCode);
    const allocationPercentage = computeAllocation(storyPoints);
    const matchedResource = findResourceForAssignedTo(state, assignedTo);
    const parsedAssignedTo = parseAssignedTo(assignedTo);

    return [{
      id: makeId('preview'),
      assigned_to: matchedResource?.name || parsedAssignedTo.name || parsedAssignedTo.raw,
      assigned_to_email: matchedResource?.email || parsedAssignedTo.email || '',
      raw_assigned_to: assignedTo,
      user_story_title: userStoryTitle,
      story_points: storyPoints,
      program: resolvedProgram.name,
      tenrox_code: resolvedProgram.tenrox_code,
      allocation_percentage: allocationPercentage,
      hours: round2(allocationPercentage * monthlyHours),
    }];
  });

  state.previewRows = previewRows;
  return previewRows;
}

function mergeAllocation(state, payload, existingId = null) {
  const resourceId = payload.resource_id;
  const programId = payload.program_id;
  const storyPoints = Number(payload.story_points);

  if (!Number.isFinite(storyPoints) || storyPoints <= 0) {
    throw new Error('Story points must be greater than 0.');
  }

  ensureNoOrphans(state, resourceId, programId);

  const duplicate = state.allocations.find(
    (allocation) => allocation.resource_id === resourceId && allocation.program_id === programId && allocation.id !== existingId,
  );

  let nextAllocations = state.allocations.map((allocation) => ({ ...allocation }));
  let savedId = existingId;

  if (existingId) {
    nextAllocations = nextAllocations.filter((allocation) => allocation.id !== existingId);
  }

  if (duplicate) {
    nextAllocations = nextAllocations.map((allocation) => {
      if (allocation.id !== duplicate.id) return allocation;
      return {
        ...allocation,
        story_points: round4(Number(allocation.story_points) + storyPoints),
        user_story_title: mergeStoryTitles(allocation.user_story_title, payload.user_story_title),
      };
    });
    savedId = duplicate.id;
  } else {
    savedId = existingId || makeId('allocation');
    nextAllocations.push({
      id: savedId,
      resource_id: resourceId,
      program_id: programId,
      story_points: round4(storyPoints),
      user_story_title: normalizeName(payload.user_story_title),
    });
  }

  ensureResourceCapacity(state, resourceId, nextAllocations);
  if (existingId) {
    const previous = state.allocations.find((allocation) => allocation.id === existingId);
    if (previous && previous.resource_id !== resourceId) {
      ensureResourceCapacity(state, previous.resource_id, nextAllocations);
    }
  }

  state.allocations = nextAllocations;
  return state.allocations.find((allocation) => allocation.id === savedId);
}

export function createAllocationRecord(state, payload) {
  return mergeAllocation(state, payload);
}

export function updateAllocationRecord(state, id, payload) {
  const existing = state.allocations.find((allocation) => allocation.id === id);
  if (!existing) throw new Error('Allocation not found.');
  return mergeAllocation(state, {
    resource_id: payload.resource_id,
    program_id: payload.program_id,
    story_points: Number(payload.story_points),
  }, id);
}

export function deleteAllocationRecord(state, id) {
  state.allocations = state.allocations.filter((allocation) => allocation.id !== id);
}

export function commitPreviewRows(state) {
  const committed = [];

  state.previewRows.forEach((preview) => {
    let resource = findResourceByEmail(state, preview.assigned_to_email) || findResourceByName(state, preview.assigned_to);
    if (!resource) {
      resource = upsertResourceRecord(state, {
        name: preview.assigned_to,
        email: preview.assigned_to_email,
        region: 'Unknown',
        max_capacity: 1,
      }, { updateExisting: false });
    }

    const program = upsertProgramRecord(
      state,
      { name: preview.program || 'Unknown', tenrox_code: preview.tenrox_code || 'N/A' },
      { updateExisting: preview.program !== 'Unknown', allowUnknownComposite: true },
    );

    committed.push(createAllocationRecord(state, {
      resource_id: resource.id,
      program_id: program.id,
      story_points: Number(preview.story_points),
      user_story_title: preview.user_story_title,
    }));
  });

  state.previewRows = [];
  return committed;
}

export function updateConfigRecord(state, payload) {
  state.config = {
    ...state.config,
    total_resources: payload.total_resources === '' || payload.total_resources === undefined ? state.config.total_resources : round4(payload.total_resources),
    monthly_hours: payload.monthly_hours === '' || payload.monthly_hours === undefined ? state.config.monthly_hours : round2(payload.monthly_hours),
    selected_month: payload.selected_month === undefined ? state.config.selected_month : Number(payload.selected_month),
    selected_year: payload.selected_year === undefined ? state.config.selected_year : Number(payload.selected_year),
  };
  return state.config;
}

export function createResourceRecord(state, payload) {
  return upsertResourceRecord(state, payload, { updateExisting: true });
}

export function createProgramRecord(state, payload) {
  return upsertProgramRecord(state, payload, { updateExisting: true });
}

export function clearCurrentPlanning(state) {
  state.allocations = [];
  state.previewRows = [];
}

export function listResources(state) {
  return sortResources(state.resources);
}

export function listPrograms(state) {
  return sortPrograms(state.programs);
}

export function saveSnapshot(state) {
  const key = snapshotKey(state.config.selected_month, state.config.selected_year);
  const updated = localStorage.getItem(key) !== null;
  localStorage.setItem(key, JSON.stringify({
    resources: state.resources,
    programs: state.programs,
    allocations: state.allocations,
    config: state.config,
  }));
  return { key, updated };
}

export function listSnapshots() {
  const snapshots = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(SNAPSHOT_PREFIX)) continue;
    snapshots.push({
      key,
      label: key.replace(SNAPSHOT_PREFIX, '').replace('_', ' '),
    });
  }
  return snapshots.sort((left, right) => left.key.localeCompare(right.key));
}

export function loadSnapshot(state, key) {
  const raw = localStorage.getItem(key);
  if (!raw) throw new Error('Snapshot not found.');
  const snapshot = JSON.parse(raw);
  state.resources = Array.isArray(snapshot.resources) ? snapshot.resources : [];
  state.programs = Array.isArray(snapshot.programs) ? snapshot.programs : [];
  state.allocations = Array.isArray(snapshot.allocations) ? snapshot.allocations : [];
  state.config = { ...state.config, ...(snapshot.config || {}) };
  state.previewRows = [];
}
