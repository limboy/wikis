#!/usr/bin/env node
/* eslint-disable @typescript-eslint/explicit-function-return-type -- standalone Node CLI */

import Database from 'better-sqlite3'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { homedir } from 'node:os'
import process from 'node:process'
import { isDeepStrictEqual } from 'node:util'

const KNOWLEDGE_TYPES = new Set(['concept', 'viewpoint', 'narrative', 'reflection'])
const RELATION_TYPES = new Set([
  'derived_from',
  'requires',
  'related_to',
  'contrasts_with',
  'part_of'
])
const SOURCE_TYPES = new Set(['book', 'article', 'video', 'podcast', 'conversation', 'personal'])
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ENTRY_FIELDS = new Set([
  'id',
  'title',
  'type',
  'oneLiner',
  'content',
  'source',
  'related',
  'tags',
  'createdAt',
  'updatedAt'
])

function assertKnownFields(value, allowedFields, label) {
  const unknownFields = Object.keys(value).filter((field) => !allowedFields.has(field))
  if (unknownFields.length > 0) {
    throw new Error(`${label} contains unknown field(s): ${unknownFields.join(', ')}`)
  }
}

function fail(message, details) {
  const payload = { ok: false, error: message }
  if (details !== undefined) payload.details = details
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`)
  process.exitCode = 1
}

function parseArgs(argv) {
  const positionals = []
  const options = {}

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) {
      positionals.push(token)
      continue
    }

    const name = token.slice(2)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`Option --${name} requires a value`)
    }
    options[name] = value
    index += 1
  }

  return { positionals, options }
}

function defaultDbPath() {
  if (process.env.WIKIS_DB_PATH) return process.env.WIKIS_DB_PATH

  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'wikis', 'wikis.db')
  }
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
    return join(appData, 'wikis', 'wikis.db')
  }

  const configRoot = process.env.XDG_CONFIG_HOME || join(homedir(), '.config')
  return join(configRoot, 'wikis', 'wikis.db')
}

function normalizePath(input) {
  if (!input) return resolve(defaultDbPath())
  if (input === '~') return homedir()
  if (input.startsWith('~/')) return join(homedir(), input.slice(2))
  return isAbsolute(input) ? input : resolve(input)
}

function initializeDatabase(dbPath) {
  const parent = dirname(dbPath)
  if (!existsSync(parent)) mkdirSync(parent, { recursive: true })

  const database = new Database(dbPath)
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')
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
  return database
}

function getEntry(database, id) {
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
    .get(id)

  if (!row) return null

  const tags = database
    .prepare('SELECT tag FROM tags WHERE entry_id = ? ORDER BY tag')
    .all(id)
    .map(({ tag }) => tag)
  const related = database
    .prepare(
      `
      SELECT target_id AS targetId, type
      FROM related_links
      WHERE source_id = ?
      ORDER BY target_id, type
    `
    )
    .all(id)

  const entry = {
    id: row.id,
    title: row.title,
    type: row.type,
    oneLiner: row.oneLiner,
    ...(row.content ? { content: row.content } : {}),
    related,
    tags,
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

function getAllEntries(database) {
  const ids = database
    .prepare('SELECT id FROM entries ORDER BY createdAt DESC, id ASC')
    .all()
    .map(({ id }) => id)
  return ids.map((id) => getEntry(database, id))
}

function readJson(filePath) {
  if (!filePath) throw new Error('Missing --file <path>; use --file - to read stdin')
  const raw = filePath === '-' ? readFileSync(0, 'utf8') : readFileSync(resolve(filePath), 'utf8')
  const value = JSON.parse(raw)
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Input JSON must be an object')
  }
  return value
}

function requireString(value, field, { maxLength } = {}) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} must be a non-empty string`)
  }
  const normalized = value.trim()
  if (maxLength && Array.from(normalized).length > maxLength) {
    throw new Error(`${field} must not exceed ${maxLength} characters`)
  }
  return normalized
}

function normalizeTimestamp(value, field) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be a valid ISO 8601 timestamp`)
  }
  return new Date(value).toISOString()
}

function normalizeSource(source) {
  if (source === undefined || source === null) return undefined
  if (typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('source must be an object')
  }
  assertKnownFields(source, new Set(['type', 'title', 'author', 'url']), 'source')
  if (!SOURCE_TYPES.has(source.type)) {
    throw new Error(`source.type must be one of: ${[...SOURCE_TYPES].join(', ')}`)
  }

  return {
    type: source.type,
    title: requireString(source.title, 'source.title'),
    ...(source.author === undefined
      ? {}
      : { author: requireString(source.author, 'source.author') }),
    ...(source.url === undefined ? {} : { url: requireString(source.url, 'source.url') })
  }
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) throw new Error('tags must be an array')
  const normalized = [
    ...new Set(tags.map((tag, index) => requireString(tag, `tags[${index}]`)))
  ].sort()
  if (normalized.length < 3 || normalized.length > 5) {
    throw new Error('tags must contain 3 to 5 unique values')
  }
  return normalized
}

function normalizeRelated(database, entryId, related) {
  if (!Array.isArray(related)) throw new Error('related must be an array')

  const seen = new Set()
  return related
    .map((relation, index) => {
      if (!relation || typeof relation !== 'object' || Array.isArray(relation)) {
        throw new Error(`related[${index}] must be an object`)
      }
      assertKnownFields(relation, new Set(['targetId', 'type']), `related[${index}]`)
      const targetId = requireString(relation.targetId, `related[${index}].targetId`)
      if (!ID_PATTERN.test(targetId)) {
        throw new Error(`related[${index}].targetId must use kebab-case`)
      }
      if (targetId === entryId) throw new Error('related cannot point to the entry itself')
      if (!RELATION_TYPES.has(relation.type)) {
        throw new Error(`related[${index}].type must be one of: ${[...RELATION_TYPES].join(', ')}`)
      }
      if (!getEntry(database, targetId)) {
        throw new Error(`related target does not exist: ${targetId}`)
      }

      const key = `${targetId}\0${relation.type}`
      if (seen.has(key)) throw new Error(`Duplicate relation: ${targetId} (${relation.type})`)
      seen.add(key)
      return { targetId, type: relation.type }
    })
    .sort((left, right) => {
      const leftKey = `${left.targetId}\0${left.type}`
      const rightKey = `${right.targetId}\0${right.type}`
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0
    })
}

function normalizeEntry(database, input, { existing, now }) {
  assertKnownFields(input, ENTRY_FIELDS, 'entry')
  const id = requireString(input.id, 'id')
  if (!ID_PATTERN.test(id)) throw new Error('id must use lowercase kebab-case')
  if (existing && id !== existing.id) throw new Error('id is immutable')

  const type = requireString(input.type, 'type')
  if (!KNOWLEDGE_TYPES.has(type)) {
    throw new Error(`type must be one of: ${[...KNOWLEDGE_TYPES].join(', ')}`)
  }

  const content =
    input.content === undefined || input.content === null || input.content === ''
      ? undefined
      : requireString(input.content, 'content')
  const createdAt = existing
    ? existing.createdAt
    : normalizeTimestamp(input.createdAt || now, 'createdAt')

  return {
    id,
    title: requireString(input.title, 'title'),
    type,
    oneLiner: requireString(input.oneLiner, 'oneLiner', { maxLength: 60 }),
    ...(content ? { content } : {}),
    ...(input.source ? { source: normalizeSource(input.source) } : {}),
    related: normalizeRelated(database, id, input.related || []),
    tags: normalizeTags(input.tags),
    createdAt,
    updatedAt: existing ? now : normalizeTimestamp(input.updatedAt || now, 'updatedAt')
  }
}

function sameEntry(left, right) {
  return isDeepStrictEqual(left, right)
}

function persistEntry(database, entry, mode) {
  const insert = database.prepare(`
    INSERT INTO entries (
      id, title, type, oneLiner, content,
      source_type, source_title, source_author, source_url,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const update = database.prepare(`
    UPDATE entries SET
      title = ?, type = ?, oneLiner = ?, content = ?,
      source_type = ?, source_title = ?, source_author = ?, source_url = ?,
      updatedAt = ?
    WHERE id = ?
  `)
  const deleteTags = database.prepare('DELETE FROM tags WHERE entry_id = ?')
  const insertTag = database.prepare('INSERT INTO tags (entry_id, tag) VALUES (?, ?)')
  const deleteRelated = database.prepare('DELETE FROM related_links WHERE source_id = ?')
  const insertRelated = database.prepare(
    'INSERT INTO related_links (source_id, target_id, type) VALUES (?, ?, ?)'
  )

  database.transaction(() => {
    const values = [
      entry.title,
      entry.type,
      entry.oneLiner,
      entry.content || null,
      entry.source?.type || null,
      entry.source?.title || null,
      entry.source?.author || null,
      entry.source?.url || null
    ]

    if (mode === 'create') {
      insert.run(entry.id, ...values, entry.createdAt, entry.updatedAt)
    } else {
      const result = update.run(...values, entry.updatedAt, entry.id)
      if (result.changes !== 1) throw new Error(`Entry not found during update: ${entry.id}`)
      deleteTags.run(entry.id)
      deleteRelated.run(entry.id)
    }

    for (const tag of entry.tags) insertTag.run(entry.id, tag)
    for (const relation of entry.related) {
      insertRelated.run(entry.id, relation.targetId, relation.type)
    }

    const verified = getEntry(database, entry.id)
    if (!verified || !sameEntry(verified, entry)) {
      throw new Error(`Database verification failed for entry: ${entry.id}`)
    }
  })()

  return getEntry(database, entry.id)
}

function output(operation, dbPath, data) {
  process.stdout.write(`${JSON.stringify({ ok: true, operation, dbPath, data }, null, 2)}\n`)
}

function usage() {
  return `Usage:
  knowledge-db.mjs list [--db <path>]
  knowledge-db.mjs get <id> [--db <path>]
  knowledge-db.mjs create --file <entry.json|-> [--db <path>]
  knowledge-db.mjs update <id> --file <patch.json|-> [--db <path>]
  knowledge-db.mjs upsert --file <entry.json|-> [--db <path>]
  knowledge-db.mjs delete <id> [--db <path>]`
}

let database

try {
  const { positionals, options } = parseArgs(process.argv.slice(2))
  const unsupportedOptions = Object.keys(options).filter((name) => !['db', 'file'].includes(name))
  if (unsupportedOptions.length > 0) {
    throw new Error(
      `Unsupported option(s): ${unsupportedOptions.map((name) => `--${name}`).join(', ')}`
    )
  }
  const [operation, id, ...extra] = positionals
  if (!operation || extra.length > 0) throw new Error(usage())

  const dbPath = normalizePath(options.db)
  database = initializeDatabase(dbPath)

  if (operation === 'list') {
    if (id) throw new Error(usage())
    output(operation, dbPath, getAllEntries(database))
  } else if (operation === 'get') {
    if (!id) throw new Error(usage())
    output(operation, dbPath, getEntry(database, id))
  } else if (operation === 'create') {
    if (id) throw new Error(usage())
    const input = readJson(options.file)
    if (getEntry(database, input.id)) throw new Error(`Entry already exists: ${input.id}`)
    const now = new Date().toISOString()
    const entry = normalizeEntry(database, input, { now })
    output(operation, dbPath, persistEntry(database, entry, 'create'))
  } else if (operation === 'update') {
    if (!id) throw new Error(usage())
    const existing = getEntry(database, id)
    if (!existing) throw new Error(`Entry not found: ${id}`)
    const patch = readJson(options.file)
    if (patch.id !== undefined && patch.id !== id) throw new Error('id is immutable')
    if (patch.createdAt !== undefined && patch.createdAt !== existing.createdAt) {
      throw new Error('createdAt is immutable')
    }
    const now = new Date().toISOString()
    const entry = normalizeEntry(
      database,
      { ...existing, ...patch, id, createdAt: existing.createdAt },
      { existing, now }
    )
    output(operation, dbPath, persistEntry(database, entry, 'update'))
  } else if (operation === 'upsert') {
    if (id) throw new Error(usage())
    const input = readJson(options.file)
    const existing = input.id ? getEntry(database, input.id) : null
    const now = new Date().toISOString()
    const entry = normalizeEntry(
      database,
      existing ? { ...existing, ...input, id: existing.id, createdAt: existing.createdAt } : input,
      { existing, now }
    )
    const writeMode = existing ? 'update' : 'create'
    output(`${operation}:${writeMode}`, dbPath, persistEntry(database, entry, writeMode))
  } else if (operation === 'delete') {
    if (!id) throw new Error(usage())
    const existing = getEntry(database, id)
    if (!existing) throw new Error(`Entry not found: ${id}`)
    const incomingSources = database
      .prepare('SELECT DISTINCT source_id AS sourceId FROM related_links WHERE target_id = ?')
      .all(id)
      .map(({ sourceId }) => sourceId)
    database.transaction(() => {
      database.prepare('DELETE FROM related_links WHERE target_id = ?').run(id)
      const result = database.prepare('DELETE FROM entries WHERE id = ?').run(id)
      if (result.changes !== 1 || getEntry(database, id) !== null) {
        throw new Error(`Database verification failed while deleting: ${id}`)
      }
      const dangling = database
        .prepare('SELECT COUNT(*) AS count FROM related_links WHERE target_id = ?')
        .get(id)
      if (dangling.count !== 0) {
        throw new Error(`Incoming relation cleanup failed while deleting: ${id}`)
      }
      if (incomingSources.length > 0) {
        const now = new Date().toISOString()
        const markUpdated = database.prepare('UPDATE entries SET updatedAt = ? WHERE id = ?')
        for (const sourceId of incomingSources) markUpdated.run(now, sourceId)
      }
    })()
    output(operation, dbPath, {
      id,
      deleted: true,
      cleanedIncomingRelationsFrom: incomingSources
    })
  } else {
    throw new Error(usage())
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
} finally {
  database?.close()
}
