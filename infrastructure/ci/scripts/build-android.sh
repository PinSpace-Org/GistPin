#!/usr/bin/env bash
set -euo pipefail

COMMAND="${1:-build}"
BUMP_TYPE="${2:-patch}"

bump_version() {
  local type="$1"
  local version_file="android/app/build.gradle"
  node -e "
    const fs = require('fs');
    let content = fs.readFileSync('$version_file', 'utf8');
    const match = content.match(/versionName \"(\\d+)\\.(\\d+)\\.(\\d+)\"/);
    if (!match) { console.error('versionName not found'); process.exit(1); }
    let [major, minor, patch] = match.slice(1).map(Number);
    if ('$type' === 'major') { major++; minor = 0; patch = 0; }
    else if ('$type' === 'minor') { minor++; patch = 0; }
    else { patch++; }
    const newVersion = \`\${major}.\${minor}.\${patch}\`;
    content = content.replace(/versionName \"[^\"]+\"/, \`versionName \"\${newVersion}\"\`);
    fs.writeFileSync('$version_file', content);
    console.log('Android version bumped to', newVersion);
  "
}

build_android() {
  # Decode keystore
  echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > android/app/release.keystore

  cd android
  ./gradlew assembleRelease \
    -Pandroid.injected.signing.store.file=app/release.keystore \
    -Pandroid.injected.signing.store.password="$ANDROID_STORE_PASSWORD" \
    -Pandroid.injected.signing.key.alias="$ANDROID_KEY_ALIAS" \
    -Pandroid.injected.signing.key.password="$ANDROID_KEY_PASSWORD"

  echo "Android APK built successfully."
}

case "$COMMAND" in
  bump)   bump_version "$BUMP_TYPE" ;;
  build)  build_android ;;
  *)      echo "Usage: $0 [bump|build] [patch|minor|major]"; exit 1 ;;
esac
