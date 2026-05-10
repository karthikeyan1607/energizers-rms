import { db } from '../db/database.js';

export function clearPreviewImports() {
  db.prepare("DELETE FROM imported_data WHERE status = 'preview'").run();
}

export function insertImportRow({ assigned_to, story_points, program, tenrox_code, iteration, hours, status = 'preview' }) {
  const result = db.prepare(`
    INSERT INTO imported_data (assigned_to, story_points, program, tenrox_code, iteration, hours, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(assigned_to, story_points, program, tenrox_code || null, iteration || null, hours, status);
  return db.prepare('SELECT * FROM imported_data WHERE id = ?').get(result.lastInsertRowid);
}

export function clearAcceptedPreviewImports() {
  db.prepare("DELETE FROM imported_data WHERE status = 'preview'").run();
}

export function listImports(status = null) {
  return db.prepare(`
    SELECT * FROM imported_data
    WHERE (? IS NULL OR status = ?)
    ORDER BY id ASC
  `).all(status, status);
}

export function markPreviewCommitted() {
  db.prepare("UPDATE imported_data SET status = 'committed' WHERE status = 'preview'").run();
}
