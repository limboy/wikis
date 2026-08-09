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

interface SetDataLocationOptions {
  dir: string
  moveExisting: boolean
}

type SetDataLocationResult = { ok: true } | { ok: false; error: string }

/**
 * Repoints the configured data directory at `dir`, optionally carrying the
 * existing SQLite files over. `closeDb` is injected rather than imported to
 * avoid a settings <-> db import cycle; the caller (main/index.ts) is
 * expected to restart the app on success so a fresh connection opens at the
 * new path.
 */
export function setDataLocation(
  options: SetDataLocationOptions,
  closeDb: () => void
): SetDataLocationResult {
  const targetDir = resolve(options.dir)
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

    if (options.moveExisting) {
      const conflict = DB_FILE_NAMES.some((name) => existsSync(join(targetDir, name)))
      if (conflict) {
        return {
          ok: false,
          error: '目标目录中已存在数据库文件，请选择空文件夹，或取消勾选"移动现有数据"'
        }
      }

      closeDb()

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
    } else {
      closeDb()
    }

    writePersisted({
      ...readPersisted(),
      dataDir: targetDir === resolve(getDefaultDataDir()) ? null : targetDir
    })

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
