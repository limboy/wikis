# Wikis

A modern personal knowledge base desktop application for macOS built with Electron, React, TypeScript, and SQLite.

## Features

- **Structured Knowledge Cards**: Categorize notes into Concepts, Viewpoints, Narratives, and Questions (概念、观点、叙事、问题).
- **Interlinked Knowledge Network**: Define directional relationships between notes (`derived_from`, `requires`, `related_to`, `contrasts_with`, `part_of`).
- **Stacked / Multi-Pane Interface**: Open and compare multiple notes and source references side-by-side.
- **Source & Tag Tracking**: Attribute entries to books, articles, videos, podcasts, conversations, or personal thoughts with tag filtering.
- **Markdown & GFM Support**: Full Markdown rendering with CJK formatting, task lists, and table formatting.
- **Local-First & Offline**: Stored in a high-performance local SQLite database (`better-sqlite3`) with WAL mode.
- **AI Agent Skill**: Built-in agent skill (`add-wiki`) to extract, structure, and maintain knowledge cards using AI.

## Tech Stack

- **Framework**: Electron + Vite (`electron-vite`)
- **Frontend**: React 19, TypeScript, TanStack Router, Tailwind CSS v4, Base UI
- **Database**: SQLite (`better-sqlite3`)
- **Markdown Engine**: Unified / Remark / Rehype

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- macOS (for building macOS native packages)

### Installation

```bash
npm install
```

### Development

Start the app in development mode with hot reload:

```bash
npm run dev
```

## Production Build

Build the native macOS app bundle (`.app`), DMG, and ZIP installer:

```bash
npm run build:mac
```

*Note: Output artifacts are written to `dist/`.*

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start development server with Electron Vite |
| `npm run build` | Compile TypeScript and build web assets |
| `npm run build:mac` | Build production macOS application bundle & installers |
| `npm run typecheck` | Run TypeScript type checks (node & web targets) |
| `npm run lint` | Run ESLint checks |
| `npm run format` | Format code using Prettier |

## Data Storage & Configuration

By default, Wikis stores your local SQLite database at:
- **macOS**: `~/Library/Application Support/wikis/wikis.db`

You can override the database location by setting the `WIKIS_DB_PATH` environment variable:

```bash
WIKIS_DB_PATH=/path/to/custom/wikis.db npm run dev
```

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
