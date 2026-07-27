import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { watch, existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  initDatabase,
  getDatabasePath,
  seedInitialEntriesIfEmpty,
  getAllEntries,
  getEntryById,
  createEntry,
  updateEntry,
  deleteEntry,
  KnowledgeEntry
} from './db'
import { initialKnowledgeEntries } from './initial-data'

let watchDebounceTimer: NodeJS.Timeout | null = null

function broadcastDbUpdated(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('db:updated')
    }
  }
}

function notifyDbUpdated(): void {
  if (watchDebounceTimer) {
    clearTimeout(watchDebounceTimer)
  }
  watchDebounceTimer = setTimeout(() => {
    watchDebounceTimer = null
    broadcastDbUpdated()
  }, 300)
}

function setupDatabaseWatcher(dbPath: string): void {
  const dir = dirname(dbPath)
  if (!existsSync(dir)) return

  try {
    watch(dir, (_, filename) => {
      if (filename && (filename.startsWith('wikis.db') || filename.includes('wikis.db'))) {
        notifyDbUpdated()
      }
    })
  } catch (err) {
    console.error('[SQLite] Failed to set up file watcher:', err)
  }
}

function setupIpcHandlers(): void {
  ipcMain.handle('db:getAllEntries', () => {
    return getAllEntries()
  })

  ipcMain.handle('db:getEntryById', (_, id: string) => {
    return getEntryById(id)
  })

  ipcMain.handle('db:createEntry', (_, entry: KnowledgeEntry) => {
    const res = createEntry(entry)
    notifyDbUpdated()
    return res
  })

  ipcMain.handle('db:updateEntry', (_, id: string, entry: KnowledgeEntry) => {
    const res = updateEntry(id, entry)
    notifyDbUpdated()
    return res
  })

  ipcMain.handle('db:deleteEntry', (_, id: string) => {
    const res = deleteEntry(id)
    notifyDbUpdated()
    return res
  })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
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
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.wikis')

  // Initialize SQLite database and seed initial entries
  const dbPath = getDatabasePath()
  initDatabase()
  seedInitialEntriesIfEmpty(initialKnowledgeEntries)
  setupIpcHandlers()
  setupDatabaseWatcher(dbPath)

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
