import { listAllocations, createAllocation, updateAllocation, deleteAllocation, sumResourceAllocation, getAllocationByResourceProgram } from '../repositories/allocationRepository.js';
import { getResource } from '../repositories/resourceRepository.js';
import { getProgram } from '../repositories/programRepository.js';
import { getCapacityContext } from './capacityService.js';
import { EPSILON, round2, round4 } from '../utils/precision.js';

export function storyPointsToAllocation(storyPoints) {
  return round4(Number(storyPoints) * 0.1);
}

function validateAllocationPayload({ resource_id, program_id, story_points }) {
  if (!resource_id || !getResource(resource_id)) {
    const error = new Error('Valid resource_id is required.');
    error.status = 400;
    throw error;
  }
  if (!program_id || !getProgram(program_id)) {
    const error = new Error('Valid program_id is required.');
    error.status = 400;
    throw error;
  }
  const points = Number(story_points);
  if (!Number.isFinite(points) || points < 0) {
    const error = new Error('story_points must be a number greater than or equal to 0.');
    error.status = 400;
    throw error;
  }
}

export function assertResourceCapacity(resourceId, allocation, excludeAllocationId = null) {
  const resource = getResource(resourceId);
  const currentTotal = Number(sumResourceAllocation(resourceId, excludeAllocationId));
  const nextTotal = round4(currentTotal + Number(allocation));
  if (nextTotal - Number(resource.max_capacity) > EPSILON) {
    const error = new Error(`${resource.name} would be allocated ${round2(nextTotal * 100)}%, exceeding max capacity ${round2(resource.max_capacity * 100)}%.`);
    error.status = 409;
    error.details = { resource_id: resourceId, attempted_allocation: nextTotal, max_capacity: resource.max_capacity };
    throw error;
  }
}

export function getAllocationsWithComputedHours() {
  const { monthlyHours } = getCapacityContext();
  return listAllocations().map((allocation) => ({
    ...allocation,
    story_points: round4(allocation.story_points),
    allocation_percentage: round4(allocation.allocation_percentage),
    hours: round2(Number(allocation.allocation_percentage) * monthlyHours),
  }));
}

export function createValidatedAllocation(payload) {
  validateAllocationPayload(payload);
  const { monthlyHours } = getCapacityContext();
  const storyPoints = round4(payload.story_points);
  const existing = getAllocationByResourceProgram(payload.resource_id, payload.program_id);
  const mergedStoryPoints = round4((existing?.story_points || 0) + storyPoints);
  const allocation = storyPointsToAllocation(mergedStoryPoints);
  assertResourceCapacity(payload.resource_id, allocation, existing?.id || null);

  const values = {
    ...payload,
    story_points: mergedStoryPoints,
    allocation_percentage: allocation,
    hours: round2(allocation * monthlyHours),
  };

  if (existing) {
    return updateAllocation(existing.id, values);
  }

  return createAllocation(values);
}

export function updateValidatedAllocation(id, payload) {
  const current = listAllocations().find((allocation) => allocation.id === Number(id));
  if (!current) {
    const error = new Error('Allocation not found.');
    error.status = 404;
    throw error;
  }
  const merged = { ...current, ...payload };
  validateAllocationPayload(merged);
  const { monthlyHours } = getCapacityContext();
  const storyPoints = round4(merged.story_points);
  const allocation = storyPointsToAllocation(storyPoints);
  assertResourceCapacity(merged.resource_id, allocation, Number(id));
  return updateAllocation(id, {
    resource_id: merged.resource_id,
    program_id: merged.program_id,
    story_points: storyPoints,
    allocation_percentage: allocation,
    hours: round2(allocation * monthlyHours),
  });
}

export function removeAllocation(id) {
  return deleteAllocation(id);
}
