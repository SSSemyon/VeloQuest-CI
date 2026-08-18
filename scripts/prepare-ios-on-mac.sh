#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
  echo "This script must run on macOS with Xcode installed." >&2
  exit 1
fi

command -v node >/dev/null 2>&1 || { echo "Node.js is required." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required." >&2; exit 1; }
command -v xcodebuild >/dev/null 2>&1 || { echo "Xcode command-line tools are required." >&2; exit 1; }

npm ci
EXPO_NO_TELEMETRY=1 ./node_modules/.bin/expo prebuild --platform ios --clean
npx --yes pod-install ios

echo "Open ios/VeloQuest.xcworkspace, select your Personal Team and physical device, then Run."
open ios/VeloQuest.xcworkspace
