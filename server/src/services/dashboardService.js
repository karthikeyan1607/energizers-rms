import { getConfig } from '../repositories/configRepository.js';
import { listResources } from '../repositories/resourceRepository.js';
import { listPrograms } from '../repositories/programRepository.js';
import { getAllocationsWithComputedHours } from './allocationService.js';
import { getCapacityContext } from './capacityService.js';
import { generateProgramResourceSummary } from './allocationFormatter.js';
import { percent, round2, round4 } from '../utils/precision.js';

export function buildDashboard() {
  const { config, period, monthlyHours, totalCapacityHours } = getCapacityContext();
  const resources = listResources();
  const programs = listPrograms();
  const allocations = getAllocationsWithComputedHours();
  const totalResources = Number(config.total_resources);
  const usedCapacity = round4(allocations.reduce((sum, allocation) => sum + Number(allocation.allocation_percentage), 0));
  const remainingCapacity = round4(totalResources - usedCapacity);

  const resourceUtilization = resources.map((resource) => {
    const resourceAllocations = allocations.filter((allocation) => allocation.resource_id === resource.id);
    const totalAllocation = round4(resourceAllocations.reduce((sum, allocation) => sum + Number(allocation.allocation_percentage), 0));
    const maxCapacity = Number.isFinite(Number(resource.max_capacity)) ? Number(resource.max_capacity) : 1;
    return {
      ...resource,
      allocation_percentage: totalAllocation,
      allocation_percent: percent(totalAllocation),
      remaining_capacity: round4(Math.max(0, maxCapacity - totalAllocation)),
      allocated_hours: round2(totalAllocation * monthlyHours),
      allocations: resourceAllocations,
    };
  });

  const programSummary = programs.map((program) => {
    const programAllocations = allocations.filter((allocation) => allocation.program_id === program.id);
    const totalProgramResources = round4(programAllocations.reduce((sum, allocation) => sum + Number(allocation.allocation_percentage), 0));
    const regionTotal = (region) => round4(programAllocations
      .filter((allocation) => allocation.region === region)
      .reduce((sum, allocation) => sum + Number(allocation.allocation_percentage), 0));
    return {
      ...program,
      india_resources: regionTotal('India'),
      usa_resources: regionTotal('USA'),
      europe_resources: regionTotal('Europe'),
      total_program_resources: totalProgramResources,
      percent_of_total_resources: totalResources > 0 ? round4(totalProgramResources / totalResources) : 0,
      program_hours: round2(totalProgramResources * monthlyHours),
      resource_allocation_summary: generateProgramResourceSummary(program.id, allocations),
    };
  });

  return {
    planning_period: period,
    config: getConfig(),
    totals: {
      total_resources: totalResources,
      monthly_hours: monthlyHours,
      total_capacity_hours: totalCapacityHours,
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
