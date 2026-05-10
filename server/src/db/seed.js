import { migrate } from './schema.js';
import { db } from './database.js';

export function seed() {
  migrate();

  const periodCount = db.prepare('SELECT COUNT(*) AS count FROM planning_periods').get().count;
  if (periodCount === 0) {
    const insertPeriod = db.prepare(`
      INSERT INTO planning_periods (month, working_days, hours_per_day, total_hours)
      VALUES (?, ?, ?, ?)
    `);
    insertPeriod.run('2026-05', 21, 8, 168);
    insertPeriod.run('2026-06', 22, 8, 176);
    insertPeriod.run('2026-07', 23, 8, 184);
  }

  const selectedPeriod = db.prepare('SELECT id FROM planning_periods WHERE month = ?').get('2026-05');
  db.prepare(`
    INSERT INTO config (id, total_resources, monthly_hours, story_point_ratio, selected_planning_period_id)
    VALUES (1, 0, 176, 6, ?)
    ON CONFLICT(id) DO NOTHING
  `).run(selectedPeriod?.id ?? null);
}

if (process.argv[1]?.endsWith('seed.js')) {
  seed();
  console.log('Database seeded.');
}
