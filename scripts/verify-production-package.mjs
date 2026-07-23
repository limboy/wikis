import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listPackage } from '@electron/asar'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'))

const allowedRuntimeDependencies = new Set([
  '@electron-toolkit/preload',
  '@electron-toolkit/utils',
  'better-sqlite3'
])

const declaredRuntimeDependencies = Object.keys(packageJson.dependencies ?? {})
const unexpectedDeclarations = declaredRuntimeDependencies.filter(
  (name) => !allowedRuntimeDependencies.has(name)
)
const missingDeclarations = [...allowedRuntimeDependencies].filter(
  (name) => !declaredRuntimeDependencies.includes(name)
)

if (unexpectedDeclarations.length || missingDeclarations.length) {
  const details = [
    unexpectedDeclarations.length
      ? `Unexpected runtime dependencies: ${unexpectedDeclarations.join(', ')}`
      : null,
    missingDeclarations.length
      ? `Missing required runtime dependencies: ${missingDeclarations.join(', ')}`
      : null
  ]
    .filter(Boolean)
    .join('\n')

  throw new Error(
    `${details}\nRenderer and build-only packages belong in devDependencies. ` +
      'Update this allowlist only when the packaged main or preload process needs a new module.'
  )
}

const appPathArgument = process.argv[2]
if (!appPathArgument) {
  console.log(
    `Runtime dependency declaration check passed (${declaredRuntimeDependencies.length} packages).`
  )
  process.exit(0)
}

const appPath = resolve(appPathArgument)
const resourcesPath = join(appPath, 'Contents', 'Resources')
const asarPath = join(resourcesPath, 'app.asar')
if (!existsSync(asarPath)) {
  throw new Error(`Packaged archive not found: ${asarPath}`)
}

const archiveEntries = listPackage(asarPath).map((entry) =>
  entry.replaceAll('\\', '/').replace(/^\/+/, '')
)

// The verifier is plain JavaScript so it can run before the TypeScript build.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function topLevelPackageName(entry) {
  if (!entry.startsWith('node_modules/')) return null

  const parts = entry.slice('node_modules/'.length).split('/')
  if (parts[0]?.startsWith('@')) {
    return parts[1] ? `${parts[0]}/${parts[1]}` : null
  }
  return parts[0]
}

const packagedDependencies = new Set(archiveEntries.map(topLevelPackageName).filter((name) => name))
const unexpectedPackagedDependencies = [...packagedDependencies].filter(
  (name) => !allowedRuntimeDependencies.has(name)
)
const missingPackagedDependencies = [...allowedRuntimeDependencies].filter(
  (name) => !packagedDependencies.has(name)
)

if (unexpectedPackagedDependencies.length || missingPackagedDependencies.length) {
  throw new Error(
    [
      unexpectedPackagedDependencies.length
        ? `Unexpected packaged dependencies: ${unexpectedPackagedDependencies.join(', ')}`
        : null,
      missingPackagedDependencies.length
        ? `Missing packaged dependencies: ${missingPackagedDependencies.join(', ')}`
        : null
    ]
      .filter(Boolean)
      .join('\n')
  )
}

const betterSqlitePrefix = 'node_modules/better-sqlite3/'
const forbiddenBetterSqliteContent = archiveEntries.filter(
  (entry) =>
    entry.startsWith(`${betterSqlitePrefix}src/`) ||
    entry.startsWith(`${betterSqlitePrefix}deps/`) ||
    entry === `${betterSqlitePrefix}binding.gyp`
)
if (forbiddenBetterSqliteContent.length) {
  throw new Error('better-sqlite3 build sources were included in the production archive.')
}

const expectedArch = process.env.WIKIS_BUILD_ARCH ?? process.arch
const expectedPrebuild = `darwin-${expectedArch}.node`
const unpackedPrebuildDirectory = join(
  resourcesPath,
  'app.asar.unpacked',
  'node_modules',
  'better-sqlite3',
  'prebuilds'
)
const packagedPrebuilds = existsSync(unpackedPrebuildDirectory)
  ? readdirSync(unpackedPrebuildDirectory).filter((name) =>
      statSync(join(unpackedPrebuildDirectory, name)).isFile()
    )
  : []

if (packagedPrebuilds.length !== 1 || packagedPrebuilds[0] !== expectedPrebuild) {
  throw new Error(
    `Expected only ${expectedPrebuild} in the unpacked native bindings, found: ` +
      (packagedPrebuilds.join(', ') || 'none')
  )
}

console.log(
  `Production package check passed: ${packagedDependencies.size} runtime dependencies, ` +
    `native binding ${expectedPrebuild}.`
)
