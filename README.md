# Bomb Arena

2D bomber arcade for Android. Plant bombs, break crates, last one standing.

## Download APK

**[BombArena.apk](https://github.com/JaguarIF/bomb-arena/releases/latest/download/BombArena.apk)**

On the phone:

1. Open the link in Chrome
2. Allow install from this source if Android asks
3. Install → open **Bomb Arena**

The APK is debug-signed for sideload (not Play Store). Android 7+.

If an older build showed a black screen, install **1.2.0+**.

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
