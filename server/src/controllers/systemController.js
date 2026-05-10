import { listPlanningPeriods, createPlanningPeriod } from '../repositories/planningPeriodRepository.js';
import { updateConfig, getConfig } from '../repositories/configRepository.js';

export function getPlanningPeriods(req, res) {
  res.json(listPlanningPeriods());
}

export function postPlanningPeriod(req, res) {
  const { month, working_days, hours_per_day = 8 } = req.body;
  if (!/^\d{4}-\d{2}$/.test(month || '')) {
    return res.status(400).json({ error: 'month must use YYYY-MM format.' });
  }
  res.status(201).json(createPlanningPeriod({ month, working_days, hours_per_day }));
}

export function getSystemConfig(req, res) {
  res.json(getConfig());
}

export function putSystemConfig(req, res) {
  res.json(updateConfig(req.body));
}
