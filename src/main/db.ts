import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

export type KnowledgeType = 'concept' | 'story' | 'event' | 'excerpt' | 'general'

export type RelationType =
  | 'derived_from'
  | 'requires'
  | 'related_to'
  | 'contrasts_with'
  | 'part_of'

export interface RelatedLink {
  targetId: string
  type: RelationType
}

export interface Source {
  type: 'book' | 'article' | 'video' | 'podcast' | 'conversation' | 'personal'
  title: string
  author?: string
  url?: string
}

export interface KnowledgeEntry {
  id: string
  title: string
  type: KnowledgeType
  oneLiner: string
  whatItIs: string
  whyItMatters: string
  deepDive: string
  source?: Source
  related: RelatedLink[]
  tags: string[]
  createdAt: string
  updatedAt: string
}

let db: Database.Database | null = null

export function initDatabase(customPath?: string): Database.Database {
  if (db && !customPath) return db

  const dbPath = customPath || join(app.getPath('userData'), 'wikis.db')
  const dir = join(dbPath, '..')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  console.log('[SQLite] Connecting to database at:', dbPath)

  const instance = new Database(dbPath)
  instance.pragma('journal_mode = WAL')
  instance.pragma('foreign_keys = ON')

  // Create Tables
  instance.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      oneLiner TEXT NOT NULL,
      whatItIs TEXT NOT NULL,
      whyItMatters TEXT NOT NULL,
      deepDive TEXT NOT NULL,
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

  if (!customPath) {
    db = instance
  }
  return instance
}

export function getAllEntries(customDb?: Database.Database): KnowledgeEntry[] {
  const database = customDb || initDatabase()

  const rows = database
    .prepare(
      `
    SELECT 
      id, title, type, oneLiner, whatItIs, whyItMatters, deepDive,
      source_type, source_title, source_author, source_url,
      createdAt, updatedAt
    FROM entries
    ORDER BY createdAt DESC
  `
    )
    .all() as any[]

  const getTagsStmt = database.prepare(`SELECT tag FROM tags WHERE entry_id = ?`)
  const getRelatedStmt = database.prepare(
    `SELECT target_id as targetId, type FROM related_links WHERE source_id = ?`
  )

  return rows.map((row) => {
    const tagsRows = getTagsStmt.all(row.id) as { tag: string }[]
    const relatedRows = getRelatedStmt.all(row.id) as { targetId: string; type: RelationType }[]

    const entry: KnowledgeEntry = {
      id: row.id,
      title: row.title,
      type: row.type,
      oneLiner: row.oneLiner,
      whatItIs: row.whatItIs,
      whyItMatters: row.whyItMatters,
      deepDive: row.deepDive,
      tags: tagsRows.map((t) => t.tag),
      related: relatedRows,
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
  })
}

export function getEntryById(id: string, customDb?: Database.Database): KnowledgeEntry | null {
  const database = customDb || initDatabase()

  const row = database
    .prepare(
      `
    SELECT 
      id, title, type, oneLiner, whatItIs, whyItMatters, deepDive,
      source_type, source_title, source_author, source_url,
      createdAt, updatedAt
    FROM entries
    WHERE id = ?
  `
    )
    .get(id) as any

  if (!row) return null

  const tagsRows = database
    .prepare(`SELECT tag FROM tags WHERE entry_id = ?`)
    .all(id) as { tag: string }[]
  const relatedRows = database
    .prepare(`SELECT target_id as targetId, type FROM related_links WHERE source_id = ?`)
    .all(id) as { targetId: string; type: RelationType }[]

  const entry: KnowledgeEntry = {
    id: row.id,
    title: row.title,
    type: row.type,
    oneLiner: row.oneLiner,
    whatItIs: row.whatItIs,
    whyItMatters: row.whyItMatters,
    deepDive: row.deepDive,
    tags: tagsRows.map((t) => t.tag),
    related: relatedRows,
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

export function createEntry(entry: KnowledgeEntry, customDb?: Database.Database): KnowledgeEntry {
  const database = customDb || initDatabase()

  const insertEntry = database.prepare(`
    INSERT OR REPLACE INTO entries (
      id, title, type, oneLiner, whatItIs, whyItMatters, deepDive,
      source_type, source_title, source_author, source_url,
      createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
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
      entry.whatItIs,
      entry.whyItMatters,
      entry.deepDive,
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

export function updateEntry(id: string, entry: KnowledgeEntry, customDb?: Database.Database): KnowledgeEntry {
  const database = customDb || initDatabase()

  const updateStmt = database.prepare(`
    UPDATE entries SET
      title = ?,
      type = ?,
      oneLiner = ?,
      whatItIs = ?,
      whyItMatters = ?,
      deepDive = ?,
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
      entry.whatItIs,
      entry.whyItMatters,
      entry.deepDive,
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
  const result = database.prepare(`DELETE FROM entries WHERE id = ?`).run(id)
  return result.changes > 0
}

export function seedInitialEntriesIfEmpty(initialEntries: KnowledgeEntry[], customDb?: Database.Database): void {
  const database = customDb || initDatabase()
  console.log(`[SQLite] Syncing ${initialEntries.length} initial entries into database...`)
  for (const entry of initialEntries) {
    try {
      createEntry(entry, database)
    } catch (err) {
      console.error(`[SQLite] Error syncing entry ${entry.id}:`, err)
    }
  }
  console.log('[SQLite] Syncing completed.')
}
