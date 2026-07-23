import React from 'react'
import ReactDOM from 'react-dom/client'
import { createRouter, createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './app.css'

const memoryHistory = createMemoryHistory({ initialEntries: ['/'] })

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
