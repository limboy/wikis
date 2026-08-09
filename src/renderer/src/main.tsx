import React from 'react'
import ReactDOM from 'react-dom/client'
import { createRouter, createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { applyAppearance } from './lib/theme'
import './app.css'

// Fire-and-forget: applies before first paint in practice since IPC to the
// main process is local, and it's not worth blocking the render tree on it.
void window.api.settings.get().then((settings) => applyAppearance(settings.appearance))

// Changing the appearance setting in one window (typically the Settings
// window) should update every other open window immediately, not just the
// one the change was made in — otherwise e.g. the main window stays on the
// old theme until it's reloaded or the app is restarted.
window.api.settings.onAppearanceChanged((mode) => applyAppearance(mode))

// The main window and the settings window share this same bundle. The main
// process picks which one to show by setting the URL hash before load (see
// createSettingsWindow in main/index.ts), since there's no other signal to
// distinguish them at boot.
const initialPath = window.location.hash.startsWith('#/') ? window.location.hash.slice(1) : '/'
const memoryHistory = createMemoryHistory({ initialEntries: [initialPath] })

const router = createRouter({
  routeTree,
  history: memoryHistory
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
