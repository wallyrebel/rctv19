#!/bin/bash
set -euo pipefail

# Run from any working directory. No account, signing or system settings are changed.
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
bundled_xcodegen="${XCODEGEN_BIN_DIRECTORY:-$HOME/RCTV19Build/tools/xcodegen-2.46.0/xcodegen/bin}"
if [[ -x "$bundled_xcodegen/xcodegen" ]]; then export PATH="$bundled_xcodegen:$PATH"; fi
cd "$project_dir"
mode="${1:-preflight}"

if [[ "$(uname -s)" != Darwin ]]; then
  echo "Run this script on the Mac with Xcode installed." >&2
  exit 1
fi
xcode_version="$(xcodebuild -version)"
printf '%s\n' "$xcode_version"
sdk_version="$(xcrun --sdk appletvos --show-sdk-version)"
if [[ "${sdk_version%%.*}" -lt 26 ]]; then
    echo "This project is prepared for the tvOS 26 SDK or newer. Select a supported Xcode before building." >&2
  exit 1
fi
printf 'tvOS SDK: %s\n' "$sdk_version"
sw_vers

if [[ "$mode" == preflight ]]; then
  if command -v xcodegen >/dev/null 2>&1; then xcodegen --version; else echo "XcodeGen is not installed yet."; fi
  xcrun simctl list devices available
  exit 0
fi
if ! command -v xcodegen >/dev/null 2>&1; then
  echo "XcodeGen is required to generate the project. If Homebrew is installed: brew install xcodegen" >&2
  exit 1
fi
xcodegen generate --spec project.yml
case "$mode" in
  generate) ;;
  build)
    xcodebuild -project RCTV19TV.xcodeproj -scheme RCTV19TV \
      -configuration Debug -sdk appletvsimulator -destination 'generic/platform=tvOS Simulator' \
      -derivedDataPath build/DerivedData CODE_SIGNING_ALLOWED=NO build
    ;;
  archive)
    xcodebuild -project RCTV19TV.xcodeproj -scheme RCTV19TV \
      -configuration Release -destination 'generic/platform=tvOS' \
      -archivePath build/RCTV19TV.xcarchive CODE_SIGNING_ALLOWED=NO archive
    ;;
  test|test-playback)
    if [[ -z "${TVOS_SIMULATOR_ID:-}" ]]; then
      echo "Set TVOS_SIMULATOR_ID to an available Apple TV simulator UUID from the preflight output." >&2
      exit 1
    fi
    test_scheme=RCTV19TV
    if [[ "$mode" == test-playback ]]; then test_scheme=RCTV19TVPlayback; fi
    xcodebuild -project RCTV19TV.xcodeproj -scheme "$test_scheme" \
      -configuration Debug -destination "platform=tvOS Simulator,id=$TVOS_SIMULATOR_ID" \
      -derivedDataPath build/DerivedData CODE_SIGNING_ALLOWED=NO test
    ;;
  *) echo "Usage: bash scripts/mac-build.sh preflight|generate|build|test|test-playback|archive" >&2; exit 1 ;;
esac
