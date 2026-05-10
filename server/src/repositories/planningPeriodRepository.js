import { db } from '../db/database.js';

export function listPlanningPeriods() {
  return db.prepare('SELECT * FROM planning_periods ORDER BY month DESC').all();
}

export function createPlanningPeriod({ month, working_days, hours_per_day = 8 }) {
  const totalHours = Number(working_days) * Number(hours_per_day);
  const result = db.prepare(`
    INSERT INTO planning_periods (month, working_days, hours_per_day, total_hours)
    VALUES (?, ?, ?, ?)
  `).run(month, working_days, hours_per_day, totalHours);
  return db.prepare('SELECT * FROM planning_periods WHERE id = ?').get(result.lastInsertRowid);
}

export function getPlanningPeriod(id) {
  return db.prepare('SELECT * FROM planning_periods WHERE id = ?').get(id);
}
