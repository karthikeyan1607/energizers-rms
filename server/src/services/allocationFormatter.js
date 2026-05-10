import { listAllocations } from '../repositories/allocationRepository.js';
import { round2, round4 } from '../utils/precision.js';

function formatAllocation(value) {
  return String(round2(value));
}

export function generateProgramResourceSummary(programId, allocations = listAllocations()) {
  const resourceTotals = new Map();
  allocations
    .filter((allocation) => Number(allocation.program_id) === Number(programId))
    .forEach((allocation) => {
      const key = Number(allocation.resource_id);
      const current = resourceTotals.get(key) || {
        resource_name: allocation.resource_name,
        allocation_percentage: 0,
      };
      current.allocation_percentage = round4(current.allocation_percentage + Number(allocation.allocation_percentage));
      resourceTotals.set(key, current);
    });

  return [...resourceTotals.values()]
    .sort((a, b) => Number(b.allocation_percentage) - Number(a.allocation_percentage))
    .map((allocation) => `${allocation.resource_name} (${formatAllocation(allocation.allocation_percentage)})`)
    .join(', ');
}
