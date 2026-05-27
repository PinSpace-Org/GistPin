#!/usr/bin/env bash
set -euo pipefail

COMMAND="${1:-build}"
BUMP_TYPE="${2:-patch}"

bump_version() {
  local type="$1"
  agvtool what-marketing-version -terse1 | read current_version || current_version="1.0.0"
  node -e "
    let [major, minor, patch] = '${current_version:-1.0.0}'.split('.').map(Number);
    if ('$type' === 'major') { major++; minor = 0; patch = 0; }
    else if ('$type' === 'minor') { minor++; patch = 0; }
    else { patch++; }
    const newVersion = \`\${major}.\${minor}.\${patch}\`;
    const { execSync } = require('child_process');
    execSync(\`agvtool new-marketing-version \${newVersion}\`);
    execSync('agvtool next-version -all');
    console.log('iOS version bumped to', newVersion);
  "
}

build_ios() {
  # Install certificate
  echo "$IOS_CERTIFICATE_BASE64" | base64 -d > /tmp/certificate.p12
  security create-keychain -p "" build.keychain
  security import /tmp/certificate.p12 -k build.keychain -P "$IOS_CERTIFICATE_PASSWORD" -T /usr/bin/codesign
  security list-keychains -s build.keychain
  security default-keychain -s build.keychain
  security unlock-keychain -p "" build.keychain
  security set-key-partition-list -S apple-tool:,apple: -s -k "" build.keychain

  # Install provisioning profile
  mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
  echo "$IOS_PROVISIONING_PROFILE_BASE64" | base64 -d > ~/Library/MobileDevice/Provisioning\ Profiles/profile.mobileprovision

  # Build
  xcodebuild -workspace ios/GistPin.xcworkspace \
    -scheme GistPin \
    -configuration Release \
    -archivePath ios/build/GistPin.xcarchive \
    DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
    archive

  xcodebuild -exportArchive \
    -archivePath ios/build/GistPin.xcarchive \
    -exportPath ios/build \
    -exportOptionsPlist ios/ExportOptions.plist

  echo "iOS IPA built successfully."
}

upload_testflight() {
  echo "$APPLE_API_KEY_BASE64" | base64 -d > /tmp/AuthKey.p8
  xcrun altool --upload-app \
    --type ios \
    --file ios/build/GistPin.ipa \
    --apiKey "$APPLE_API_KEY_ID" \
    --apiIssuer "$APPLE_API_ISSUER_ID" \
    --private-key /tmp/AuthKey.p8
  echo "Uploaded to TestFlight."
}

case "$COMMAND" in
  bump)   bump_version "$BUMP_TYPE" ;;
  build)  build_ios ;;
  upload) upload_testflight ;;
  *)      echo "Usage: $0 [bump|build|upload] [patch|minor|major]"; exit 1 ;;
esac
