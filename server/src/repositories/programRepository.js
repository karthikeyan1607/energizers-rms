import { db } from '../db/database.js';

export function listPrograms() {
  return db.prepare('SELECT * FROM programs ORDER BY name').all();
}

export function createProgram({
  name,
  tenrox_code = 'N/A',
  india_percentage = 0,
  usa_percentage = 0,
  europe_percentage = 0,
}) {
  const result = db.prepare(`
    INSERT INTO programs (name, tenrox_code, india_percentage, usa_percentage, europe_percentage)
    VALUES (?, ?, ?, ?, ?)
  `).run(name.trim(), tenrox_code?.trim() || 'N/A', india_percentage, usa_percentage, europe_percentage);
  return getProgram(result.lastInsertRowid);
}

export function updateProgram(id, { name, tenrox_code, india_percentage, usa_percentage, europe_percentage }) {
  const current = getProgram(id);
  db.prepare(`
    UPDATE programs
    SET name = ?, tenrox_code = ?, india_percentage = ?, usa_percentage = ?, europe_percentage = ?
    WHERE id = ?
  `).run(
    name?.trim() || current.name,
    tenrox_code?.trim() || current.tenrox_code || 'N/A',
    india_percentage ?? current.india_percentage,
    usa_percentage ?? current.usa_percentage,
    europe_percentage ?? current.europe_percentage,
    id,
  );
  return getProgram(id);
}

export function upsertProgramByName({ name, tenrox_code = 'N/A', updateExisting = false }) {
  const existing = db.prepare('SELECT * FROM programs WHERE lower(name) = lower(?)').get(name.trim());
  if (existing) {
    if (updateExisting || (!existing.tenrox_code && tenrox_code)) {
      return updateProgram(existing.id, { tenrox_code: tenrox_code || 'N/A' });
    }
    return existing;
  }
  return createProgram({ name, tenrox_code });
}

export function getProgram(id) {
  return db.prepare('SELECT * FROM programs WHERE id = ?').get(id);
}

export function getProgramByName(name) {
  return db.prepare('SELECT * FROM programs WHERE lower(name) = lower(?)').get(name.trim());
}

export function getProgramByTenroxCode(tenroxCode) {
  return db.prepare('SELECT * FROM programs WHERE lower(tenrox_code) = lower(?)').get(tenroxCode.trim());
}
