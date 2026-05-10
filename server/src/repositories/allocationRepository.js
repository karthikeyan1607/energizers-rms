import { db } from '../db/database.js';

export function listAllocations() {
  return db.prepare(`
    SELECT a.*, r.name AS resource_name, r.region, r.max_capacity,
           p.name AS program_name, p.tenrox_code
    FROM allocations a
    JOIN resources r ON r.id = a.resource_id
    JOIN programs p ON p.id = a.program_id
    ORDER BY a.id
  `).all();
}

export function getAllocation(id) {
  return db.prepare('SELECT * FROM allocations WHERE id = ?').get(id);
}

export function getAllocationByResourceProgram(resourceId, programId) {
  return db.prepare(`
    SELECT * FROM allocations
    WHERE resource_id = ? AND program_id = ?
    ORDER BY id
    LIMIT 1
  `).get(resourceId, programId);
}

export function sumResourceAllocation(resourceId, excludeAllocationId = null) {
  return db.prepare(`
    SELECT COALESCE(SUM(allocation_percentage), 0) AS total
    FROM allocations
    WHERE resource_id = ? AND (? IS NULL OR id != ?)
  `).get(resourceId, excludeAllocationId, excludeAllocationId).total;
}

export function createAllocation({ resource_id, program_id, story_points, allocation_percentage, hours, source = 'manual' }) {
  const result = db.prepare(`
    INSERT INTO allocations (resource_id, program_id, story_points, allocation_percentage, hours, source)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(resource_id, program_id, story_points, allocation_percentage, hours, source);
  return getAllocation(result.lastInsertRowid);
}

export function updateAllocation(id, { resource_id, program_id, story_points, allocation_percentage, hours }) {
  const current = getAllocation(id);
  db.prepare(`
    UPDATE allocations
    SET resource_id = ?, program_id = ?, story_points = ?, allocation_percentage = ?, hours = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    resource_id ?? current.resource_id,
    program_id ?? current.program_id,
    story_points ?? current.story_points,
    allocation_percentage ?? current.allocation_percentage,
    hours ?? current.hours,
    id,
  );
  return getAllocation(id);
}

export function deleteAllocation(id) {
  return db.prepare('DELETE FROM allocations WHERE id = ?').run(id);
}
