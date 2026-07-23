import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  initDatabase,
  seedInitialEntriesIfEmpty,
  getAllEntries,
  getEntryById,
  createEntry,
  updateEntry,
  deleteEntry,
  KnowledgeEntry
} from './db'
import { initialKnowledgeEntries } from './initial-data'

function setupIpcHandlers(): void {
  ipcMain.handle('db:getAllEntries', () => {
    return getAllEntries()
  })

  ipcMain.handle('db:getEntryById', (_, id: string) => {
    return getEntryById(id)
  })

  ipcMain.handle('db:createEntry', (_, entry: KnowledgeEntry) => {
    return createEntry(entry)
  })

  ipcMain.handle('db:updateEntry', (_, id: string, entry: KnowledgeEntry) => {
    return updateEntry(id, entry)
  })

  ipcMain.handle('db:deleteEntry', (_, id: string) => {
    return deleteEntry(id)
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
