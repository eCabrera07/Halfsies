# Android Capacitor Wrapper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the existing Halfsies web app in Capacitor to produce a sideloadable Android debug APK with no changes to the web app source.

**Architecture:** Install Capacitor into the existing repo root. Write `capacitor.config.ts` pointing at `dist/`. Run `npx cap add android` to scaffold the `android/` project. Build flow is `npm run build && npx cap sync`, then build the APK in Android Studio.

**Tech Stack:** Vite, React, TypeScript (existing), `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, Android Studio, Java 17+.

---

## File Structure

- Create: `capacitor.config.ts` — Capacitor app config (appId, appName, webDir)
- Modify: `package.json` — add `@capacitor/*` deps and `build:android` script
- Modify: `.gitignore` — exclude Android build artifacts
- Generate: `android/` — scaffolded by `npx cap add android`, committed to repo

---

### Task 1: Install Capacitor and write config

**Files:**
- Modify: `package.json`
- Create: `capacitor.config.ts`

- [ ] **Step 1: Install Capacitor packages**

Run:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```
Expected: packages added to `node_modules`, `package.json` dependencies updated.

- [ ] **Step 2: Write the Capacitor config**

Create `capacitor.config.ts` at the repo root:

```ts
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.halfsies.app',
  appName: 'Halfsies',
  webDir: 'dist',
}

export default config
```

- [ ] **Step 3: Add build:android convenience script**

In `package.json`, add to the `"scripts"` block:

```json
"build:android": "npm run build && npx cap sync"
```

- [ ] **Step 4: Verify Capacitor can read the config**

Run:
```bash
npx cap doctor
```
Expected output includes `✔ @capacitor/core` and `✔ @capacitor/android` with no errors. A warning about no platforms yet is fine — the next task adds Android.

- [ ] **Step 5: Commit**

```bash
git add capacitor.config.ts package.json package-lock.json
git commit -m "feat: add Capacitor config and deps for Android wrapper"
```

---

### Task 2: Scaffold the Android platform

**Files:**
- Generate: `android/` (entire folder, tracked in git)
- Modify: `.gitignore`

- [ ] **Step 1: Add the Android platform**

Run:
```bash
npx cap add android
```
Expected: `android/` folder created at repo root with a Gradle project inside. Output ends with `✔ Adding android project`.

- [ ] **Step 2: Update .gitignore for Android build artifacts**

Add the following to `.gitignore`:

```
# Android build artifacts
android/.gradle/
android/app/build/
android/build/
android/local.properties
```

`local.properties` holds machine-specific SDK paths and must not be committed.

- [ ] **Step 3: Verify the android folder looks correct**

Run:
```bash
ls android/
```
Expected: `app/`, `build.gradle`, `settings.gradle`, `gradlew`, `gradlew.bat`, `variables.gradle` and similar Gradle files.

- [ ] **Step 4: Commit**

```bash
git add android/ .gitignore
git commit -m "feat: scaffold Capacitor Android platform"
```

---

### Task 3: First build and sync

**Files:**
- No source changes — this task verifies the pipeline end-to-end.

- [ ] **Step 1: Build the web app**

Run:
```bash
npm run build
```
Expected: `dist/` populated. Output ends with `✓ built in Xms`.

- [ ] **Step 2: Sync web assets into the Android project**

Run:
```bash
npx cap sync
```
Expected output:
```
✔ Copying web assets from dist to android/app/src/main/assets/public
✔ Copying native bridge
✔ Processing configuration values
✔ Syncing Gradle
```

- [ ] **Step 3: Verify assets were copied**

Run:
```bash
ls android/app/src/main/assets/public/
```
Expected: `index.html`, `assets/` folder with JS and CSS bundles — same files as `dist/`.

- [ ] **Step 4: Run existing tests to confirm no regressions**

Run:
```bash
npm test
```
Expected: all 30 tests pass.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/assets/
git commit -m "chore: sync web assets into Android project"
```

---

### Task 4: Build the debug APK in Android Studio

**Files:**
- No source changes — this task produces the APK via Android Studio.

Prerequisites: Android Studio installed (download from https://developer.android.com/studio). Android Studio ships with a bundled JDK 17 — no separate Java install required.

- [ ] **Step 1: Open the Android project in Android Studio**

In Android Studio: **File → Open** → navigate to `C:\Dev\Halfsies\android` → click OK.

Wait for the Gradle sync to complete (progress bar in the bottom status bar). First sync downloads dependencies and may take several minutes.

- [ ] **Step 2: Confirm Gradle sync succeeded**

Expected: no red errors in the `Build` output panel. Warnings about deprecated APIs are fine. If sync fails with `SDK location not found`, go to **File → Project Structure → SDK Location** and set the Android SDK path (typically `C:\Users\<you>\AppData\Local\Android\Sdk`).

- [ ] **Step 3: Build the debug APK**

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

Wait for the build to complete. Expected output in the `Build` panel:
```
BUILD SUCCESSFUL in Xs
```

- [ ] **Step 4: Locate the APK**

The APK is at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

Android Studio also shows a `locate` link in the notification that appears after a successful build — click it to open the folder directly.

---

### Task 5: Install on device and smoke test

**Files:**
- No source changes — manual verification on device.

- [ ] **Step 1: Enable developer options and USB debugging on your Android device**

On the device: **Settings → About Phone → tap "Build number" 7 times** to unlock Developer Options. Then: **Settings → Developer Options → enable USB Debugging**.

- [ ] **Step 2: Install the APK via adb**

Connect device via USB. Run:
```bash
adb devices
```
Expected: your device listed with `device` status (not `unauthorized`).

Then install:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```
Expected: `Success`

Alternatively, copy `app-debug.apk` to your phone via USB, open it from Files, and tap Install (requires "Install unknown apps" permission for your file manager).

- [ ] **Step 3: Smoke test — camera capture**

Open Halfsies on the device. Tap the camera/upload button. Confirm the native camera opens and a photo can be selected. This verifies `<input type="file" accept="image/*" capture="environment">` works in the Capacitor WebView.

- [ ] **Step 4: Smoke test — Tesseract OCR**

After selecting a receipt photo, confirm OCR runs and items appear in the review screen. This is the critical test — it verifies that Tesseract.js WASM and WebWorker load correctly from the local HTTP server Capacitor runs inside the Android WebView.

If OCR hangs or crashes: open `chrome://inspect` in desktop Chrome with the device connected, select the Halfsies WebView, and check the console for WASM or worker loading errors.

- [ ] **Step 5: Smoke test — share results**

Complete the full flow (assign items, go to summary) and tap Share. Confirm the native Android share sheet opens. This verifies `navigator.share()` works in the Capacitor WebView.

- [ ] **Step 6: Commit smoke test note to docs**

Update `docs/superpowers/specs/2026-05-27-android-capacitor-design.md` — change the smoke test line from a future note to a confirmed result:

```markdown
**Smoke test:** Verified on device — Tesseract.js WASM, camera capture, and Web Share API all work correctly in the Capacitor Android WebView.
```

```bash
git add docs/superpowers/specs/2026-05-27-android-capacitor-design.md
git commit -m "docs: mark Android smoke test as verified"
```

---

## Phase 2: Google Play Internal Testing

**Goal:** Publish Halfsies to the Google Play Store on the Internal Testing track so up to 100 specific people can install it directly from the Play Store.

**Prerequisites:**
- Phase 1 complete (APK sideloading working)
- Android Studio installed
- $25 Google Play Developer account (one-time, pay at https://play.google.com/console)
- The existing `public/favicon.svg` is used as the icon source — keep it as-is

---

### Task 6: Generate the release signing keystore

**Files:**
- Create: `android/keystore/halfsies-release.jks` (not committed — add to .gitignore)
- Modify: `.gitignore`
- Create: `android/keystore/keystore.properties` (not committed — add to .gitignore)

- [ ] **Step 1: Add keystore files to .gitignore**

Add to `.gitignore`:
```
# Release signing — never commit these
android/keystore/
```

- [ ] **Step 2: Create the keystore directory**

```bash
mkdir android/keystore
```

- [ ] **Step 3: Generate the release keystore**

Run in the repo root (fill in your own values for the prompts):
```bash
keytool -genkey -v -keystore android/keystore/halfsies-release.jks -alias halfsies -keyalg RSA -keysize 2048 -validity 10000
```

When prompted:
- **Keystore password:** choose a strong password, save it somewhere safe
- **Key password:** can be the same as keystore password
- **First and last name, org, city, country:** can be your real name and location

Expected: `android/keystore/halfsies-release.jks` created.

- [ ] **Step 4: Write keystore.properties**

Create `android/keystore/keystore.properties` with your actual values:
```
storeFile=../keystore/halfsies-release.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=halfsies
keyPassword=YOUR_KEY_PASSWORD
```

- [ ] **Step 5: Wire signing into the Android Gradle build**

Edit `android/app/build.gradle`. Find the `android { ... }` block and add a `signingConfigs` block, then reference it in `buildTypes`:

```groovy
def keystorePropertiesFile = rootProject.file("keystore/keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config ...

    signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

- [ ] **Step 6: Commit the Gradle change (not the keystore)**

```bash
git add android/app/build.gradle .gitignore
git commit -m "feat: wire release signing config into Android Gradle build"
```

---

### Task 7: Generate Android icon assets from the existing SVG

**Files:**
- Modify: `android/app/src/main/res/` — replace default Capacitor icons with Halfsies branding

The existing icon is `public/favicon.svg` — a purple lightning-bolt shape. Android requires PNG icons at multiple densities plus a 512×512 PNG for the Play Store listing.

- [ ] **Step 1: Install sharp (one-time, for icon generation)**

```bash
npm install --save-dev sharp
```

- [ ] **Step 2: Write the icon generation script**

Create `scripts/generate-android-icons.mjs`:

```js
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const svg = readFileSync('public/favicon.svg')

const sizes = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
]

const resDir = 'android/app/src/main/res'

for (const { dir, size } of sizes) {
  const outDir = join(resDir, dir)
  mkdirSync(outDir, { recursive: true })
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(join(outDir, 'ic_launcher.png'))
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(join(outDir, 'ic_launcher_round.png'))
  console.log(`✔ ${dir}/ic_launcher.png (${size}×${size})`)
}

// Play Store listing icon (512×512)
await sharp(svg).resize(512, 512).png().toFile('android/playstore-icon.png')
console.log('✔ android/playstore-icon.png (512×512) — upload this to Play Console')
```

- [ ] **Step 3: Run the script**

```bash
node scripts/generate-android-icons.mjs
```

Expected: icon PNGs written to each `mipmap-*` directory, plus `android/playstore-icon.png`.

- [ ] **Step 4: Commit the generated icons**

```bash
git add android/app/src/main/res/ android/playstore-icon.png scripts/generate-android-icons.mjs
git commit -m "feat: generate Android icon assets from favicon SVG"
```

---

### Task 8: Build the release AAB and publish to Internal Testing

**Files:**
- No source changes — this task produces the AAB and sets up Play Console.

- [ ] **Step 1: Create your Google Play Developer account**

Go to https://play.google.com/console → sign in with your Google account → pay the $25 one-time registration fee → complete identity verification.

- [ ] **Step 2: Create the app in Play Console**

In Play Console: **All apps → Create app** → fill in:
- App name: `Halfsies`
- Default language: `English (United States)`
- App or game: `App`
- Free or paid: `Free`

Accept the declarations and click **Create app**.

- [ ] **Step 3: Complete the minimum required store listing**

Play Console requires a short description, full description, and at least 2 screenshots even for Internal Testing.

Under **Store presence → Main store listing:**
- Short description (80 chars max): `Split restaurant receipts fast with friends`
- Full description (4000 chars max): a few sentences about the app
- Icon: upload `android/playstore-icon.png`
- Screenshots: take 2 screenshots from the sideloaded APK on your device and upload them

- [ ] **Step 4: Build the release AAB in Android Studio**

In Android Studio: **Build → Generate Signed Bundle / APK** → select **Android App Bundle** → select the `halfsies` keystore alias → build the **release** variant.

AAB is output to: `android/app/build/outputs/bundle/release/app-release.aab`

- [ ] **Step 5: Upload the AAB to Internal Testing**

In Play Console: **Testing → Internal testing → Create new release** → upload `app-release.aab` → click **Save and publish**.

Expected: release goes live within minutes (Internal Testing skips the review queue).

- [ ] **Step 6: Add testers**

In Play Console: **Testing → Internal testing → Testers tab** → create a testers list → add Google account emails (up to 100) → save.

Share the opt-in URL shown on that page with your testers. They open it, tap **Become a tester**, then find and install Halfsies from the Play Store normally.

- [ ] **Step 7: Verify installation from Play Store**

On a tester device: open the opt-in URL → tap **Become a tester** → open Play Store → search Halfsies or use the direct link → tap Install.

Expected: app installs and works identically to the sideloaded APK.
