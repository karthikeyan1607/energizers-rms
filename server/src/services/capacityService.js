import { getConfig } from '../repositories/configRepository.js';
import { round2 } from '../utils/precision.js';

export function requireMonthlyHours(config = getConfig()) {
  if (Number(config.monthly_hours) < 0 || !Number.isFinite(Number(config.monthly_hours))) {
    const error = new Error('Monthly hours must be configured before calculating capacity.');
    error.status = 400;
    throw error;
  }
  return Number(config.monthly_hours);
}

export function getCapacityContext() {
  const config = getConfig();
  const monthlyHours = requireMonthlyHours(config);
  return {
    config,
    period: {
      id: config.selected_planning_period_id,
      month: config.month,
      working_days: config.working_days,
      hours_per_day: config.hours_per_day,
      total_hours: monthlyHours,
    },
    monthlyHours,
    totalCapacityHours: round2(Number(config.total_resources) * monthlyHours),
  };
}
