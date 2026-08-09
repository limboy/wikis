import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  initDatabase,
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

/**
 * Tells open windows to refetch after this process writes to the database.
 * Writes made by an external tool (the knowledge-creator CLI) are picked up by
 * the renderer's window-focus refetch instead.
 */
function notifyDbUpdated(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('db:updated')
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

function openExternalIfSafe(url: string): void {
  if (isSafeExternalUrl(url)) {
    shell.openExternal(url)
  }
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

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.wikis')

  // Initialize SQLite database and seed initial entries
  initDatabase()
  seedInitialEntriesIfEmpty(initialKnowledgeEntries)
  setupIpcHandlers()

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
