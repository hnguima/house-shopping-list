#!/bin/bash
set -e
# Build without test files
# NODE_ENV=production 
tsc -b && vite build --mode development
npx cap sync android
cd android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
