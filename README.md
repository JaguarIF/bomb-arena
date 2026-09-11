# Bomb Arena

2D bomber arcade for Android. Plant bombs, break crates, last one standing.

## Download APK

**[BombArena-1.0.0.apk](https://github.com/JaguarIF/bomb-arena/releases/latest/download/BombArena-1.0.0.apk)**

On the phone: open the link → Allow install from this source → Install.

Android 8+ may ask to allow installs from the browser. The APK is debug-signed (sideload).

## Play

- Move: on-screen stick, WASD, or D-pad
- Bomb: right button or Space
- Campaign (15 levels), Arena vs AI, Endless
- Language: Українська / English (Settings)

## Build

```bash
npm install
npx vite build --config vite.apk.config.ts
rsync -a --delete apk-www/ native/android/app/src/main/assets/www/
cd native/android
./gradlew assembleRelease
```

APK: `native/android/app/build/outputs/apk/release/app-release.apk`
