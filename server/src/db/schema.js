import { db } from './database.js';

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS planning_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL UNIQUE,
      working_days INTEGER NOT NULL CHECK (working_days > 0),
      hours_per_day REAL NOT NULL DEFAULT 8 CHECK (hours_per_day > 0),
      total_hours REAL NOT NULL CHECK (total_hours > 0),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_resources REAL NOT NULL DEFAULT 0 CHECK (total_resources >= 0),
      monthly_hours REAL NOT NULL DEFAULT 176 CHECK (monthly_hours >= 0),
      story_point_ratio REAL NOT NULL DEFAULT 6 CHECK (story_point_ratio > 0),
      selected_planning_period_id INTEGER,
      FOREIGN KEY (selected_planning_period_id) REFERENCES planning_periods(id)
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      region TEXT NOT NULL CHECK (region IN ('India', 'USA', 'Europe', 'Unknown')),
      max_capacity REAL NOT NULL DEFAULT 1.0 CHECK (max_capacity > 0)
    );

    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      tenrox_code TEXT,
      india_percentage REAL NOT NULL DEFAULT 0 CHECK (india_percentage >= 0 AND india_percentage <= 1),
      usa_percentage REAL NOT NULL DEFAULT 0 CHECK (usa_percentage >= 0 AND usa_percentage <= 1),
      europe_percentage REAL NOT NULL DEFAULT 0 CHECK (europe_percentage >= 0 AND europe_percentage <= 1)
    );

    CREATE TABLE IF NOT EXISTS allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL,
      program_id INTEGER NOT NULL,
      story_points REAL NOT NULL DEFAULT 0 CHECK (story_points >= 0),
      allocation_percentage REAL NOT NULL CHECK (allocation_percentage >= 0 AND allocation_percentage <= 1),
      hours REAL NOT NULL DEFAULT 0 CHECK (hours >= 0),
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS imported_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assigned_to TEXT NOT NULL,
      story_points REAL NOT NULL DEFAULT 0 CHECK (story_points >= 0),
      program TEXT NOT NULL,
      tenrox_code TEXT,
      iteration TEXT,
      hours REAL NOT NULL CHECK (hours >= 0),
      status TEXT NOT NULL DEFAULT 'preview',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_allocations_resource ON allocations(resource_id);
    CREATE INDEX IF NOT EXISTS idx_allocations_program ON allocations(program_id);
    CREATE INDEX IF NOT EXISTS idx_imported_status ON imported_data(status);
  `);

  const configColumns = db.prepare('PRAGMA table_info(config)').all().map((column) => column.name);
  if (!configColumns.includes('monthly_hours')) {
    db.prepare('ALTER TABLE config ADD COLUMN monthly_hours REAL NOT NULL DEFAULT 176').run();
    db.prepare(`
      UPDATE config
      SET monthly_hours = COALESCE((
        SELECT total_hours FROM planning_periods WHERE id = config.selected_planning_period_id
      ), 176)
    `).run();
  }

  const allocationColumns = db.prepare('PRAGMA table_info(allocations)').all().map((column) => column.name);
  if (!allocationColumns.includes('story_points')) {
    db.prepare('ALTER TABLE allocations ADD COLUMN story_points REAL NOT NULL DEFAULT 0').run();
    db.prepare('UPDATE allocations SET story_points = ROUND(allocation_percentage / 0.1, 4) WHERE story_points = 0').run();
  }

  const allocationsSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'allocations'").get()?.sql || '';
  if (allocationsSql.includes('resources_old')) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE allocations_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id INTEGER NOT NULL,
        program_id INTEGER NOT NULL,
        story_points REAL NOT NULL DEFAULT 0 CHECK (story_points >= 0),
        allocation_percentage REAL NOT NULL CHECK (allocation_percentage >= 0 AND allocation_percentage <= 1),
        hours REAL NOT NULL DEFAULT 0 CHECK (hours >= 0),
        source TEXT NOT NULL DEFAULT 'manual',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
        FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
      );
      INSERT INTO allocations_new (id, resource_id, program_id, story_points, allocation_percentage, hours, source, created_at, updated_at)
      SELECT id, resource_id, program_id, story_points, allocation_percentage, hours, source, created_at, updated_at
      FROM allocations
      WHERE resource_id IN (SELECT id FROM resources)
        AND program_id IN (SELECT id FROM programs);
      DROP TABLE allocations;
      ALTER TABLE allocations_new RENAME TO allocations;
      PRAGMA foreign_keys = ON;
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_allocations_resource ON allocations(resource_id);
      CREATE INDEX IF NOT EXISTS idx_allocations_program ON allocations(program_id);
    `);
  }

  db.prepare(`
    DELETE FROM allocations
    WHERE resource_id NOT IN (SELECT id FROM resources)
       OR program_id NOT IN (SELECT id FROM programs)
  `).run();

  const resourcesSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'resources'").get()?.sql || '';
  if (resourcesSql.includes("'India', 'USA', 'Europe'") && !resourcesSql.includes("'Unknown'")) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      ALTER TABLE resources RENAME TO resources_old;
      CREATE TABLE resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        region TEXT NOT NULL CHECK (region IN ('India', 'USA', 'Europe', 'Unknown')),
        max_capacity REAL NOT NULL DEFAULT 1.0 CHECK (max_capacity > 0)
      );
      INSERT INTO resources (id, name, region, max_capacity)
      SELECT id, name, region, max_capacity FROM resources_old;
      DROP TABLE resources_old;
      PRAGMA foreign_keys = ON;
    `);
  }

  const allocationsSqlAfterResourceMigration = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'allocations'").get()?.sql || '';
  if (allocationsSqlAfterResourceMigration.includes('resources_old')) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE allocations_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id INTEGER NOT NULL,
        program_id INTEGER NOT NULL,
        story_points REAL NOT NULL DEFAULT 0 CHECK (story_points >= 0),
        allocation_percentage REAL NOT NULL CHECK (allocation_percentage >= 0 AND allocation_percentage <= 1),
        hours REAL NOT NULL DEFAULT 0 CHECK (hours >= 0),
        source TEXT NOT NULL DEFAULT 'manual',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
        FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
      );
      INSERT INTO allocations_new (id, resource_id, program_id, story_points, allocation_percentage, hours, source, created_at, updated_at)
      SELECT id, resource_id, program_id, story_points, allocation_percentage, hours, source, created_at, updated_at
      FROM allocations
      WHERE resource_id IN (SELECT id FROM resources)
        AND program_id IN (SELECT id FROM programs);
      DROP TABLE allocations;
      ALTER TABLE allocations_new RENAME TO allocations;
      PRAGMA foreign_keys = ON;
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_allocations_resource ON allocations(resource_id);
      CREATE INDEX IF NOT EXISTS idx_allocations_program ON allocations(program_id);
    `);
  }

  db.prepare(`
    DELETE FROM allocations
    WHERE resource_id NOT IN (SELECT id FROM resources)
       OR program_id NOT IN (SELECT id FROM programs)
  `).run();
}
