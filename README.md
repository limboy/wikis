# Wikis

A personal knowledge base built with Electron, React, and TypeScript.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Production build for this Mac

```bash
$ npm run build:mac
```

The build uses `build/wikis.logo.icon` as the macOS Icon Composer source. It
requires macOS, Xcode 26 or newer, and dependencies installed with `npm ci`.
The native `.app`, DMG, and ZIP are written to `dist/`. The script applies an
ad-hoc signature suitable for running the app on the Mac that built it; public
distribution still requires Developer ID signing and notarization.

The production build enforces a runtime-dependency allowlist, keeps only the
native SQLite binding for the current Mac architecture, limits Electron locales
to English and Simplified Chinese, and fails if the app grows beyond 320 MiB.
Renderer and build-time packages must remain in `devDependencies`.
