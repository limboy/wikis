#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ICON_SOURCE="${PROJECT_ROOT}/build/wikis.logo.icon"
PRODUCT_NAME="Wikis"

cd "${PROJECT_ROOT}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "error: the macOS production build must run on macOS." >&2
  exit 1
fi

case "$(uname -m)" in
  arm64)
    BUILD_ARCH="arm64"
    APP_OUTPUT_DIR="${PROJECT_ROOT}/dist/mac-arm64"
    ;;
  x86_64)
    BUILD_ARCH="x64"
    APP_OUTPUT_DIR="${PROJECT_ROOT}/dist/mac"
    ;;
  *)
    echo "error: unsupported Mac architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

if [[ ! -f "${ICON_SOURCE}/icon.json" ]]; then
  echo "error: Icon Composer source not found at ${ICON_SOURCE}" >&2
  exit 1
fi

if ! command -v xcrun >/dev/null 2>&1 || ! xcrun --find actool >/dev/null 2>&1; then
  echo "error: Xcode 26 or newer is required to compile ${ICON_SOURCE}." >&2
  exit 1
fi

ACTOOL_VERSION="$(
  xcrun actool --version 2>/dev/null |
    plutil -extract 'com\.apple\.actool\.version.short-bundle-version' raw -o - -
)"
ACTOOL_MAJOR="${ACTOOL_VERSION%%.*}"
if [[ ! "${ACTOOL_MAJOR}" =~ ^[0-9]+$ ]] || (( ACTOOL_MAJOR < 26 )); then
  echo "error: Xcode 26 or newer is required (found actool ${ACTOOL_VERSION})." >&2
  exit 1
fi

if [[ ! -x "${PROJECT_ROOT}/node_modules/.bin/electron-builder" ]]; then
  echo "error: dependencies are missing; run 'npm ci' first." >&2
  exit 1
fi

echo "Building ${PRODUCT_NAME} for ${BUILD_ARCH} with Icon Composer source:"
echo "  ${ICON_SOURCE}"

node "${PROJECT_ROOT}/scripts/verify-production-package.mjs"
npm run build

# Build the runnable app first so a Mac without a Developer ID certificate still
# gets a locally signed bundle. Distribution artifacts are created from this app.
CSC_IDENTITY_AUTO_DISCOVERY=false \
  "${PROJECT_ROOT}/node_modules/.bin/electron-builder" \
  --mac dir \
  "--${BUILD_ARCH}"

APP_PATH="${APP_OUTPUT_DIR}/${PRODUCT_NAME}.app"
if [[ ! -d "${APP_PATH}" ]]; then
  echo "error: expected app bundle was not created at ${APP_PATH}" >&2
  exit 1
fi

WIKIS_BUILD_ARCH="${BUILD_ARCH}" \
  node "${PROJECT_ROOT}/scripts/verify-production-package.mjs" "${APP_PATH}"

APP_SIZE_KIB="$(du -sk "${APP_PATH}" | awk '{print $1}')"
MAX_APP_SIZE_KIB="$((320 * 1024))"
if (( APP_SIZE_KIB > MAX_APP_SIZE_KIB )); then
  echo "error: app bundle is larger than the 320 MiB production budget." >&2
  echo "       Actual size: $((APP_SIZE_KIB / 1024)) MiB" >&2
  exit 1
fi
echo "App size check passed: $((APP_SIZE_KIB / 1024)) MiB (budget: 320 MiB)."

if ! codesign --verify --deep --strict "${APP_PATH}" >/dev/null 2>&1; then
  echo "Applying an ad-hoc signature for local use..."
  codesign --force --deep --sign - "${APP_PATH}"
fi

codesign --verify --deep --strict --verbose=2 "${APP_PATH}"

CSC_IDENTITY_AUTO_DISCOVERY=false \
  "${PROJECT_ROOT}/node_modules/.bin/electron-builder" \
  --mac dmg zip \
  "--${BUILD_ARCH}" \
  --prepackaged "${APP_PATH}"

echo
echo "Production build complete:"
echo "  App: ${APP_PATH}"
echo "  Installers: ${PROJECT_ROOT}/dist"
