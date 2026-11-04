#!/usr/bin/env bash
set -euo pipefail

# Use Google's headless-only browser instead of the runner's desktop Chrome.
version="$(curl --proto '=https' --fail --silent --show-error --retry 3 --max-time 30 \
  https://googlechromelabs.github.io/chrome-for-testing/LATEST_RELEASE_STABLE)"
if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "::error::Chrome for Testing returned an invalid stable version."
  exit 1
fi

browser_dir="$(mktemp -d "${RUNNER_TEMP:?}/inspectmesh-chrome.XXXXXX")"
archive="$browser_dir/chrome-headless-shell.zip"
curl --proto '=https' --fail --silent --show-error --retry 3 --max-time 120 \
  "https://storage.googleapis.com/chrome-for-testing-public/$version/linux64/chrome-headless-shell-linux64.zip" \
  --output "$archive"
unzip -q "$archive" -d "$browser_dir"
rm "$archive"

browser="$browser_dir/chrome-headless-shell-linux64/chrome-headless-shell"
"$browser" --version
printf 'CHROME_BIN=%s\n' "$browser" >> "${GITHUB_ENV:?}"
