import Database from 'better-sqlite3'
import { dirname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { getConfiguredDataDir } from './settings'
import type {
  KnowledgeEntry,
  KnowledgeType,
  RelatedLink,
  RelationType,
  Source
} from '../shared/types'

export type {
  KnowledgeEntry,
  KnowledgeType,
  RelatedLink,
  RelationType,
  Source,
  SourceType
} from '../shared/types'

interface EntryRow {
  id: string
  title: string
  type: KnowledgeType
  oneLiner: string
  content: string | null
  source_type: Source['type'] | null
  source_title: string | null
  source_author: string | null
  source_url: string | null
  createdAt: string
  updatedAt: string
}

let db: Database.Database | null = null

export function getDatabasePath(customPath?: string): string {
  return customPath || process.env.WIKIS_DB_PATH || join(getConfiguredDataDir(), 'wikis.db')
}

export function initDatabase(customPath?: string): Database.Database {
  if (db && !customPath) return db

  const dbPath = getDatabasePath(customPath)
  const dir = dirname(dbPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  console.log('[SQLite] Connecting to database at:', dbPath)

  const instance = new Database(dbPath)
  instance.pragma('journal_mode = WAL')
  instance.pragma('foreign_keys = ON')

  migrate(instance)

  if (!customPath) {
    db = instance
  }
  return instance
}

/**
 * Releases the singleton connection so the underlying files can be moved or
 * deleted (e.g. before relocating the data directory). The next call to
 * `initDatabase()` reopens at whatever `getDatabasePath()` resolves to then.
 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

/**
 * Ordered schema migrations tracked by `PRAGMA user_version`. Each step runs at
 * most once per database; append new steps, never edit or reorder existing ones.
 */
const MIGRATIONS: ReadonlyArray<(database: Database.Database) => void> = [
  // 1: base schema
  (database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        oneLiner TEXT NOT NULL,
        content TEXT,
        source_type TEXT,
        source_title TEXT,
        source_author TEXT,
        source_url TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tags (
        entry_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (entry_id, tag),
        FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS related_links (
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        type TEXT NOT NULL,
        PRIMARY KEY (source_id, target_id, type),
        FOREIGN KEY (source_id) REFERENCES entries(id) ON DELETE CASCADE
      );
    `)

    // Databases created before `content` existed predate user_version tracking.
    const columns = database.prepare(`PRAGMA table_info(entries)`).all() as { name: string }[]
    if (!columns.some((column) => column.name === 'content')) {
      database.exec(`ALTER TABLE entries ADD COLUMN content TEXT;`)
    }
  },

  // 2: indexes for backlink lookups, tag filtering and the default ordering
  (database) => {
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_related_links_target ON related_links(target_id);
      CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
      CREATE INDEX IF NOT EXISTS idx_entries_createdAt ON entries(createdAt DESC);
    `)
  },

  // 3: rename the reflection category to question
  (database) => {
    database.prepare(`UPDATE entries SET type = 'question' WHERE type = 'reflection'`).run()
  },

  // 4: rename the question category to entity
  (database) => {
    database.prepare(`UPDATE entries SET type = 'entity' WHERE type = 'question'`).run()
  }
]

function migrate(database: Database.Database): void {
  const current = database.pragma('user_version', { simple: true }) as number

  if (current >= MIGRATIONS.length) return

  for (let version = current; version < MIGRATIONS.length; version += 1) {
    database.transaction(() => {
      MIGRATIONS[version](database)
      // pragma values cannot be bound, and `version` is a loop counter we own.
      database.pragma(`user_version = ${version + 1}`)
    })()
  }

  console.log(`[SQLite] Schema migrated from version ${current} to ${MIGRATIONS.length}.`)
}

export function getAllEntries(customDb?: Database.Database): KnowledgeEntry[] {
  const database = customDb || initDatabase()

  // Three queries total: one per table, grouped in memory. Fetching tags and
  // relations per row instead turned a refresh into 2N+1 round-trips.
  const rows = database
    .prepare(
      `
    SELECT
      id, title, type, oneLiner, content,
      source_type, source_title, source_author, source_url,
      createdAt, updatedAt
    FROM entries
    ORDER BY createdAt DESC
  `
    )
    .all() as EntryRow[]

  if (rows.length === 0) return []

  const tagRows = database.prepare(`SELECT entry_id, tag FROM tags`).all() as {
    entry_id: string
    tag: string
  }[]
  const relatedRows = database
    .prepare(`SELECT source_id, target_id AS targetId, type FROM related_links`)
    .all() as { source_id: string; targetId: string; type: RelationType }[]

  const tagsByEntry = new Map<string, string[]>()
  for (const { entry_id, tag } of tagRows) {
    const list = tagsByEntry.get(entry_id)
    if (list) list.push(tag)
    else tagsByEntry.set(entry_id, [tag])
  }

  const relatedByEntry = new Map<string, RelatedLink[]>()
  for (const { source_id, targetId, type } of relatedRows) {
    const list = relatedByEntry.get(source_id)
    if (list) list.push({ targetId, type })
    else relatedByEntry.set(source_id, [{ targetId, type }])
  }

  return rows.map((row) =>
    toEntry(row, tagsByEntry.get(row.id) || [], relatedByEntry.get(row.id) || [])
  )
}

function toEntry(row: EntryRow, tags: string[], related: RelatedLink[]): KnowledgeEntry {
  const entry: KnowledgeEntry = {
    id: row.id,
    title: row.title,
    type: row.type,
    oneLiner: row.oneLiner,
    content: row.content || undefined,
    tags,
    related,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }

  if (row.source_type && row.source_title) {
    entry.source = {
      type: row.source_type,
      title: row.source_title,
      ...(row.source_author ? { author: row.source_author } : {}),
      ...(row.source_url ? { url: row.source_url } : {})
    }
  }

  return entry
}

export function getEntryById(id: string, customDb?: Database.Database): KnowledgeEntry | null {
  const database = customDb || initDatabase()

  const row = database
    .prepare(
      `
    SELECT
      id, title, type, oneLiner, content,
      source_type, source_title, source_author, source_url,
      createdAt, updatedAt
    FROM entries
    WHERE id = ?
  `
    )
    .get(id) as EntryRow | undefined

  if (!row) return null

  const tags = (
    database.prepare(`SELECT tag FROM tags WHERE entry_id = ?`).all(id) as { tag: string }[]
  ).map((t) => t.tag)
  const related = database
    .prepare(`SELECT target_id AS targetId, type FROM related_links WHERE source_id = ?`)
    .all(id) as RelatedLink[]

  return toEntry(row, tags, related)
}

export function createEntry(entry: KnowledgeEntry, customDb?: Database.Database): KnowledgeEntry {
  const database = customDb || initDatabase()

  const insertEntry = database.prepare(`
    INSERT OR REPLACE INTO entries (
      id, title, type, oneLiner, content,
      source_type, source_title, source_author, source_url,
      createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?
    )
  `)

  const insertTag = database.prepare(`
    INSERT OR IGNORE INTO tags (entry_id, tag) VALUES (?, ?)
  `)

  const insertRelated = database.prepare(`
    INSERT OR IGNORE INTO related_links (source_id, target_id, type) VALUES (?, ?, ?)
  `)

  const transaction = database.transaction(() => {
    insertEntry.run(
      entry.id,
      entry.title,
      entry.type,
      entry.oneLiner,
      entry.content || null,
      entry.source?.type || null,
      entry.source?.title || null,
      entry.source?.author || null,
      entry.source?.url || null,
      entry.createdAt,
      entry.updatedAt
    )

    if (entry.tags && entry.tags.length > 0) {
      for (const tag of entry.tags) {
        insertTag.run(entry.id, tag)
      }
    }

    if (entry.related && entry.related.length > 0) {
      for (const rel of entry.related) {
        insertRelated.run(entry.id, rel.targetId, rel.type)
      }
    }
  })

  transaction()
  return getEntryById(entry.id, database)!
}

export function updateEntry(
  id: string,
  entry: KnowledgeEntry,
  customDb?: Database.Database
): KnowledgeEntry {
  const database = customDb || initDatabase()

  const updateStmt = database.prepare(`
    UPDATE entries SET
      title = ?,
      type = ?,
      oneLiner = ?,
      content = ?,
      source_type = ?,
      source_title = ?,
      source_author = ?,
      source_url = ?,
      updatedAt = ?
    WHERE id = ?
  `)

  const deleteTags = database.prepare(`DELETE FROM tags WHERE entry_id = ?`)
  const insertTag = database.prepare(`INSERT OR IGNORE INTO tags (entry_id, tag) VALUES (?, ?)`)

  const deleteRelated = database.prepare(`DELETE FROM related_links WHERE source_id = ?`)
  const insertRelated = database.prepare(
    `INSERT OR IGNORE INTO related_links (source_id, target_id, type) VALUES (?, ?, ?)`
  )

  const transaction = database.transaction(() => {
    updateStmt.run(
      entry.title,
      entry.type,
      entry.oneLiner,
      entry.content || null,
      entry.source?.type || null,
      entry.source?.title || null,
      entry.source?.author || null,
      entry.source?.url || null,
      entry.updatedAt,
      id
    )

    deleteTags.run(id)
    if (entry.tags && entry.tags.length > 0) {
      for (const tag of entry.tags) {
        insertTag.run(id, tag)
      }
    }

    deleteRelated.run(id)
    if (entry.related && entry.related.length > 0) {
      for (const rel of entry.related) {
        insertRelated.run(id, rel.targetId, rel.type)
      }
    }
  })

  transaction()
  return getEntryById(id, database)!
}

export function deleteEntry(id: string, customDb?: Database.Database): boolean {
  const database = customDb || initDatabase()

  // related_links only cascades on source_id, so incoming relations have to be
  // cleared explicitly or other entries keep pointing at an entry that is gone.
  const deleteIncoming = database.prepare(`DELETE FROM related_links WHERE target_id = ?`)
  const deleteRow = database.prepare(`DELETE FROM entries WHERE id = ?`)

  const transaction = database.transaction(() => {
    deleteIncoming.run(id)
    return deleteRow.run(id).changes > 0
  })

  return transaction()
}

export function seedInitialEntriesIfEmpty(
  initialEntries: KnowledgeEntry[],
  customDb?: Database.Database
): void {
  const database = customDb || initDatabase()

  if (initialEntries.length === 0) return

  const { count } = database.prepare(`SELECT COUNT(*) AS count FROM entries`).get() as {
    count: number
  }
  if (count > 0) {
    console.log(`[SQLite] Database already holds ${count} entries; skipping seed.`)
    return
  }

  console.log(`[SQLite] Seeding ${initialEntries.length} initial entries into database...`)
  for (const entry of initialEntries) {
    try {
      createEntry(entry, database)
    } catch (err) {
      console.error(`[SQLite] Error seeding entry ${entry.id}:`, err)
    }
  }
  console.log('[SQLite] Seeding completed.')
}
