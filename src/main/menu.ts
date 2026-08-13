import { app, BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron'

interface MenuCallbacks {
  onOpenSettings: () => void
}

/**
 * Electron only ships a default application menu when `Menu.setApplicationMenu`
 * is never called, and that default has no Settings entry. Building our own
 * template keeps every default role (quit, copy/paste, devtools, ...) while
 * adding "设置…" on Cmd+, (Ctrl+, elsewhere) in the conventional spot.
 */
export function buildApplicationMenu(callbacks: MenuCallbacks): Menu {
  const isMac = process.platform === 'darwin'

  const settingsItem: MenuItemConstructorOptions = {
    label: '设置…',
    accelerator: 'CmdOrCtrl+,',
    click: () => callbacks.onOpenSettings()
  }

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              settingsItem,
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ] satisfies MenuItemConstructorOptions[])
      : []),
    {
      label: '文件',
      submenu: [
        ...(isMac ? [] : [settingsItem, { type: 'separator' } as MenuItemConstructorOptions]),
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? ([
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' }
            ] satisfies MenuItemConstructorOptions[])
          : ([
              { role: 'delete' },
              { type: 'separator' },
              { role: 'selectAll' }
            ] satisfies MenuItemConstructorOptions[]))
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? ([{ type: 'separator' }, { role: 'front' }] satisfies MenuItemConstructorOptions[])
          : ([{ role: 'close' }] satisfies MenuItemConstructorOptions[]))
      ]
    }
  ]

  return Menu.buildFromTemplate(template)
}

/**
 * Right-click menu for a sidebar wiki entry. Kept to the OS-native Menu
 * (rather than a custom HTML dropdown) so it matches every other context
 * menu in the app and gets platform behavior — positioning, dismissal,
 * keyboard nav — for free.
 */
export function showWikiItemContextMenu(window: BrowserWindow, onDelete: () => void): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: '删除',
      click: onDelete
    }
  ]

  Menu.buildFromTemplate(template).popup({ window })
}
