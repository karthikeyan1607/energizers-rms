import { db } from '../db/database.js';

export function getConfig() {
  return db.prepare(`
    SELECT c.*, pp.month, pp.working_days, pp.hours_per_day, pp.total_hours
    FROM config c
    LEFT JOIN planning_periods pp ON pp.id = c.selected_planning_period_id
    WHERE c.id = 1
  `).get();
}

export function updateConfig({ total_resources, monthly_hours, story_point_ratio, selected_planning_period_id }) {
  const current = getConfig();
  db.prepare(`
    UPDATE config
    SET total_resources = ?, monthly_hours = ?, story_point_ratio = ?, selected_planning_period_id = ?
    WHERE id = 1
  `).run(
    total_resources ?? current.total_resources,
    monthly_hours ?? current.monthly_hours,
    story_point_ratio ?? current.story_point_ratio,
    selected_planning_period_id ?? current.selected_planning_period_id,
  );
  return getConfig();
}

export function getSelectedPeriod() {
  const config = getConfig();
  if (!config?.selected_planning_period_id) return null;
  return {
    id: config.selected_planning_period_id,
    month: config.month,
    working_days: config.working_days,
    hours_per_day: config.hours_per_day,
    total_hours: config.total_hours,
  };
}
