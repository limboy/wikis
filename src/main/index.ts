import { app, shell, BrowserWindow, ipcMain, Menu, nativeTheme } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  initDatabase,
  closeDatabase,
  seedInitialEntriesIfEmpty,
  getAllEntries,
  getEntryById,
  createEntry,
  updateEntry,
  deleteEntry
} from './db'
import { validateEntry, validateId } from './validation'
import { isRendererUrl, isSafeExternalUrl } from './navigation'
import { initialKnowledgeEntries } from './initial-data'
import { buildApplicationMenu } from './menu'
import {
  getAppSettings,
  applyAppearance,
  setAppearance,
  chooseDataDirectory,
  dirHasDatabase,
  setDataLocation
} from './settings'
import type { AppearanceMode } from '../shared/types'

// Electron has no built-in 'cache' path key, so resolve each platform's
// conventional cache root by hand.
function resolveCacheRoot(): string {
  switch (process.platform) {
    case 'darwin':
      return join(homedir(), 'Library', 'Caches')
    case 'win32':
      return process.env.LOCALAPPDATA || join(app.getPath('appData'), '..', 'Local')
    default:
      return process.env.XDG_CACHE_HOME || join(homedir(), '.cache')
  }
}

// Electron defaults Chromium's own cache/session files (Cache, Code Cache,
// GPUCache, Cookies, etc.) into the same directory as `userData`. That
// directory (~/Library/Application Support/wikis on macOS) is meant to hold
// only what's worth backing up — our SQLite db and settings.json — so point
// the disposable Chromium data at the OS cache directory instead. Must run
// before app.whenReady() / any window creation, while it's still safe to
// change.
app.setPath('sessionData', join(resolveCacheRoot(), app.getName()))

/**
 * Tells open windows to refetch after this process writes to the database.
 * Writes made by an external tool (the add-wiki CLI) are picked up by
 * the renderer's window-focus refetch instead.
 */
function notifyDbUpdated(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('db:updated')
    }
  }
}

/**
 * Tells every open window's renderer to re-apply appearance. Each renderer
 * keeps its own `.dark` class (see preload's synchronous pre-paint pass and
 * lib/theme.ts), so changing the setting in one window — e.g. the Settings
 * window — would otherwise leave every other already-open window (the main
 * window) stuck on the old theme until it's reloaded.
 */
function notifyAppearanceChanged(mode: AppearanceMode): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('appearance:updated', mode)
    }
  }
}

function setupIpcHandlers(): void {
  ipcMain.handle('db:getAllEntries', () => {
    return getAllEntries()
  })

  ipcMain.handle('db:getEntryById', (_, id: unknown) => {
    return getEntryById(validateId(id))
  })

  ipcMain.handle('db:createEntry', (_, entry: unknown) => {
    const res = createEntry(validateEntry(entry))
    notifyDbUpdated()
    return res
  })

  ipcMain.handle('db:updateEntry', (_, id: unknown, entry: unknown) => {
    const entryId = validateId(id)
    const res = updateEntry(entryId, validateEntry(entry, entryId))
    notifyDbUpdated()
    return res
  })

  ipcMain.handle('db:deleteEntry', (_, id: unknown) => {
    const res = deleteEntry(validateId(id))
    notifyDbUpdated()
    return res
  })
}

function setupSettingsIpcHandlers(): void {
  // Sync (not handle/invoke) on purpose: preload reads this before the page's
  // own scripts run, so it can apply the dark class ahead of first paint
  // instead of racing an async round trip that loses on every restart.
  ipcMain.on('settings:getSync', (event) => {
    event.returnValue = getAppSettings()
  })

  ipcMain.handle('settings:get', () => getAppSettings())

  ipcMain.handle('settings:setAppearance', (_, mode: unknown) => {
    if (mode !== 'system' && mode !== 'light' && mode !== 'dark') {
      throw new Error('Invalid appearance mode')
    }
    const result = setAppearance(mode as AppearanceMode)
    notifyAppearanceChanged(mode as AppearanceMode)
    return result
  })

  ipcMain.handle('settings:chooseDataDirectory', () => chooseDataDirectory())

  ipcMain.handle('settings:dirHasDatabase', (_, dir: unknown) => {
    if (typeof dir !== 'string' || !dir.trim()) return false
    return dirHasDatabase(dir)
  })

  ipcMain.handle('settings:setDataLocation', (_, dir: unknown) => {
    if (typeof dir !== 'string' || !dir.trim()) {
      throw new Error('Invalid data location payload')
    }
    const result = setDataLocation(dir, closeDatabase)

    // No relaunch needed: closeDatabase() drops the connection, and the next
    // db:* call lazily reopens one at the new path (see initDatabase in
    // db.ts). Just tell open windows to refetch so they pick up whatever's
    // there.
    if (result.ok) {
      notifyDbUpdated()
    }

    return result
  })
}

function openExternalIfSafe(url: string): void {
  if (isSafeExternalUrl(url)) {
    shell.openExternal(url)
  }
}

// Matches app.css's --background for each theme (light: oklch(1 0 0), dark:
// oklch(0.145 0 0)). Electron paints this before any content does, so a
// close match keeps the window shell from flashing white while dark content
// loads underneath — the preload class fix handles the content itself.
function resolveBackgroundColor(): string {
  return nativeTheme.shouldUseDarkColors ? '#0a0a0a' : '#ffffff'
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: resolveBackgroundColor(),
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    openExternalIfSafe(details.url)
    return { action: 'deny' }
  })

  let rendererEntryUrl: string

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    rendererEntryUrl = process.env['ELECTRON_RENDERER_URL']
    mainWindow.loadURL(rendererEntryUrl)
  } else {
    const indexPath = join(__dirname, '../renderer/index.html')
    rendererEntryUrl = pathToFileURL(indexPath).toString()
    mainWindow.loadFile(indexPath)
  }

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isRendererUrl(url, rendererEntryUrl)) return
    event.preventDefault()
    openExternalIfSafe(url)
  })
}

let settingsWindow: BrowserWindow | null = null

/**
 * Settings lives in its own small window (macOS Preferences-style) rather
 * than a modal, sharing the renderer's main.tsx entry — the `#/settings`
 * hash on the load URL is how that entry decides which route to mount.
 */
function createSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show()
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 560,
    height: 480,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: '设置',
    backgroundColor: resolveBackgroundColor(),
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/settings`)
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/settings' })
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.wikis')

  applyAppearance(getAppSettings().appearance)
  Menu.setApplicationMenu(buildApplicationMenu({ onOpenSettings: createSettingsWindow }))

  // Initialize SQLite database and seed initial entries
  initDatabase()
  seedInitialEntriesIfEmpty(initialKnowledgeEntries)
  setupIpcHandlers()
  setupSettingsIpcHandlers()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
