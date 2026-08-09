import { app, dialog, nativeTheme, BrowserWindow } from 'electron'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  copyFileSync,
  unlinkSync,
  statSync
} from 'fs'
import { dirname, join, resolve } from 'path'
import type { AppearanceMode, AppSettings } from '../shared/types'

interface PersistedSettings {
  appearance: AppearanceMode
  /** null means "use the default userData directory". */
  dataDir: string | null
}

const DEFAULT_SETTINGS: PersistedSettings = {
  appearance: 'system',
  dataDir: null
}

/** The SQLite files a "move data" operation needs to carry over together. */
const DB_FILE_NAMES = ['wikis.db', 'wikis.db-wal', 'wikis.db-shm']

function isAppearanceMode(value: unknown): value is AppearanceMode {
  return value === 'system' || value === 'light' || value === 'dark'
}

// The settings file itself always lives in the default userData directory,
// regardless of where the user points the database — otherwise a future
// launch would have nowhere reliable to look it up.
function getSettingsFilePath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

let cached: PersistedSettings | null = null

function readPersisted(): PersistedSettings {
  if (cached) return cached

  try {
    const raw = readFileSync(getSettingsFilePath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>
    cached = {
      appearance: isAppearanceMode(parsed.appearance)
        ? parsed.appearance
        : DEFAULT_SETTINGS.appearance,
      dataDir: typeof parsed.dataDir === 'string' && parsed.dataDir.trim() ? parsed.dataDir : null
    }
  } catch {
    cached = { ...DEFAULT_SETTINGS }
  }

  return cached
}

function writePersisted(next: PersistedSettings): void {
  cached = next
  const file = getSettingsFilePath()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(next, null, 2), 'utf-8')
}

export function getDefaultDataDir(): string {
  return app.getPath('userData')
}

export function getConfiguredDataDir(): string {
  return readPersisted().dataDir || getDefaultDataDir()
}

export function getAppSettings(): AppSettings {
  const dataDir = getConfiguredDataDir()
  const defaultDataDir = getDefaultDataDir()
  return {
    appearance: readPersisted().appearance,
    dataDir,
    defaultDataDir,
    isDefaultDataDir: resolve(dataDir) === resolve(defaultDataDir)
  }
}

export function applyAppearance(mode: AppearanceMode): void {
  nativeTheme.themeSource = mode
}

export function setAppearance(mode: AppearanceMode): AppSettings {
  writePersisted({ ...readPersisted(), appearance: mode })
  applyAppearance(mode)
  return getAppSettings()
}

export async function chooseDataDirectory(): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow()
  const options: Electron.OpenDialogOptions = {
    title: '选择数据存储位置',
    buttonLabel: '选择',
    properties: ['openDirectory', 'createDirectory']
  }
  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options)

  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
}

type SetDataLocationResult = { ok: true } | { ok: false; error: string }

/** Whether `dir` already holds a wikis database (checked before switching to it). */
export function dirHasDatabase(dir: string): boolean {
  try {
    return existsSync(join(resolve(dir), 'wikis.db'))
  } catch {
    return false
  }
}

/**
 * Repoints the configured data directory at `dir`. If a database already
 * exists there, it's adopted as-is and the current one is left untouched;
 * otherwise the current SQLite files are moved over so the new location
 * isn't left empty. `closeDb` is injected rather than imported to avoid a
 * settings <-> db import cycle; the caller (main/index.ts) is expected to
 * restart the app on success so a fresh connection opens at the new path.
 */
export function setDataLocation(dir: string, closeDb: () => void): SetDataLocationResult {
  const targetDir = resolve(dir)
  const currentDir = resolve(getConfiguredDataDir())

  if (targetDir === currentDir) {
    return { ok: false, error: '所选目录与当前存储位置相同' }
  }

  try {
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true })
    }
    if (!statSync(targetDir).isDirectory()) {
      return { ok: false, error: '所选路径不是文件夹' }
    }

    const probe = join(targetDir, `.wikis-write-test-${Date.now()}`)
    writeFileSync(probe, '')
    unlinkSync(probe)

    const targetHasDb = dirHasDatabase(targetDir)

    closeDb()

    if (!targetHasDb) {
      // No database at the target yet — bring the current one along instead
      // of leaving the new location empty.
      for (const name of DB_FILE_NAMES) {
        const from = join(currentDir, name)
        if (!existsSync(from)) continue
        const to = join(targetDir, name)
        try {
          renameSync(from, to)
        } catch (err) {
          // Cross-device moves (e.g. different volume) can't be renamed in place.
          if ((err as NodeJS.ErrnoException).code === 'EXDEV') {
            copyFileSync(from, to)
            unlinkSync(from)
          } else {
            throw err
          }
        }
      }
    }
    // else: the target already has a database — adopt it as-is and leave
    // the current one where it is.

    writePersisted({
      ...readPersisted(),
      dataDir: targetDir === resolve(getDefaultDataDir()) ? null : targetDir
    })

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
