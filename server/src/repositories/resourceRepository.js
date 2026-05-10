import { db } from '../db/database.js';

export function listResources() {
  return db.prepare('SELECT * FROM resources ORDER BY name').all();
}

export function createResource({ name, region, max_capacity = 1 }) {
  const result = db.prepare(`
    INSERT INTO resources (name, region, max_capacity)
    VALUES (?, ?, ?)
  `).run(name.trim(), region || 'Unknown', max_capacity);
  return getResource(result.lastInsertRowid);
}

export function updateResource(id, { name, region, max_capacity }) {
  const current = getResource(id);
  db.prepare(`
    UPDATE resources
    SET name = ?, region = ?, max_capacity = ?
    WHERE id = ?
  `).run(
    name?.trim() || current.name,
    region || current.region,
    max_capacity ?? current.max_capacity,
    id,
  );
  return getResource(id);
}

export function upsertResourceByName({ name, region = 'Unknown', max_capacity = 1, updateExisting = false }) {
  const existing = db.prepare('SELECT * FROM resources WHERE lower(name) = lower(?)').get(name.trim());
  if (existing) {
    if (updateExisting) {
      return updateResource(existing.id, { region: region || 'Unknown', max_capacity });
    }
    return existing;
  }
  return createResource({ name, region, max_capacity });
}

export function getResource(id) {
  return db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
}

export function getResourceByName(name) {
  return db.prepare('SELECT * FROM resources WHERE lower(name) = lower(?)').get(name.trim());
}

export function countResourceAllocations(id) {
  return db.prepare('SELECT COUNT(*) AS count FROM allocations WHERE resource_id = ?').get(id).count;
}

export function deleteResource(id, { mode = 'delete', reassign_to_resource_id = null } = {}) {
  if (mode === 'reassign') {
    const target = reassign_to_resource_id ? getResource(reassign_to_resource_id) : null;
    if (!target) {
      const error = new Error('A valid reassignment resource is required.');
      error.status = 400;
      throw error;
    }
    const sourceTotal = db.prepare('SELECT COALESCE(SUM(allocation_percentage), 0) AS total FROM allocations WHERE resource_id = ?').get(id).total;
    const targetTotal = db.prepare('SELECT COALESCE(SUM(allocation_percentage), 0) AS total FROM allocations WHERE resource_id = ?').get(reassign_to_resource_id).total;
    if (Number(sourceTotal) + Number(targetTotal) > Number(target.max_capacity) + 0.000001) {
      const error = new Error(`Reassignment would over-allocate ${target.name}. Choose another resource or delete allocations.`);
      error.status = 409;
      throw error;
    }
    db.prepare('UPDATE allocations SET resource_id = ? WHERE resource_id = ?').run(reassign_to_resource_id, id);
  }
  return db.prepare('DELETE FROM resources WHERE id = ?').run(id);
}
