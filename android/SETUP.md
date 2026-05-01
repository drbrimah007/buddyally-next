# BuddyAlly Android — Play Store Setup

Two paths to wrap the BuddyAlly PWA into a Play Store-ready Android app.
Both produce a `.aab` (Android App Bundle) that you upload to Google Play
Console. Pick **Path A** unless you want full local control.

---

## Path A — PWABuilder.com (easiest, ~10 minutes, no install)

Microsoft maintains a free web tool that takes a PWA URL and generates a
signed Android package.

1. Open <https://www.pwabuilder.com>
2. Enter `https://buddyally.com` and click **Start**
3. Wait for the audit. PWA score should be ~100/100 (manifest, service
   worker, HTTPS — all already in place).
4. Click **Package For Stores** → **Android** → **Generate Package**
5. In the Android options dialog:
   - **Package ID:** `com.buddyally.app`
   - **App name:** `BuddyAlly`
   - **Launcher name:** `BuddyAlly`
   - **Theme color:** `#3293cb`
   - **Background color:** `#ffffff`
   - **Start URL:** `/dashboard` (so the app boots into the dashboard, not the marketing page)
   - **Display mode:** `standalone`
   - **Icon URL:** `https://buddyally.com/icon-512.png`
   - **Maskable icon URL:** same
   - **Signing key:** Choose **"Generate a new signing key"** the first time. **DOWNLOAD AND BACK UP `signing.keystore`** — Google requires this same key for every future update. Lose it = lose the app.
   - Save the keystore password and key alias somewhere safe (a password manager).
6. Click **Generate**. You'll get a ZIP containing:
   - `app-release-bundle.aab` — what you upload to Play Console
   - `app-release-signed.apk` — for sideloading / testing
   - `signing.keystore` + a text file with the SHA-256 fingerprint
   - `assetlinks.json` (we already have one, but verify the SHA matches)
7. **Open the SHA-256 fingerprint file** from the zip. Copy the SHA-256 value (looks like `AB:CD:EF:12:34:...`).
8. Open `public/.well-known/assetlinks.json` in this repo. Replace `REPLACE_WITH_SHA256_FROM_YOUR_KEYSTORE` with the SHA-256 value (keep the colons). Commit and push so it deploys to `https://buddyally.com/.well-known/assetlinks.json`.
9. Verify the file is live by visiting that URL in a browser — should return JSON.
10. Now ready to upload to Play Console (see below).

---

## Path B — Bubblewrap CLI (more control, requires local Java + Android SDK)

For if you want to script future builds or audit what gets packaged.

```bash
# One-time install (requires Node 18+ and Java 17+)
npm install -g @bubblewrap/cli

# Generate the project from the live manifest
bubblewrap init --manifest=https://buddyally.com/manifest.json
# Answer the prompts — most defaults are fine. Notable answers:
#   App package name:  com.buddyally.app
#   App version code:  1
#   Display mode:      standalone
#   Orientation:       default (lets phone decide)
#   Status bar color:  #3293cb
#   Splash bg color:   #ffffff

# First build also generates a signing key — back it up.
bubblewrap build

# This produces app-release-bundle.aab + app-release-signed.apk
# Keep android.keystore safe forever.
```

The SHA-256 fingerprint is printed at the end of `bubblewrap build`. Update
`public/.well-known/assetlinks.json` with it (same as step 8 above) and push.

---

## Upload to Google Play Console

1. Go to <https://play.google.com/console>. Pay the $25 one-time developer
   fee if you haven't. ID verification can take 24–48h on first signup.
2. **Create app:**
   - App name: `BuddyAlly`
   - Default language: English (United States)
   - App or game: App
   - Free or paid: Free
   - Declarations: check both
3. **Set up your app — left sidebar walks you through everything:**
   - **App access** — say "All functionality available without restrictions" (or note that signup is required and provide a test account: `tester@buddyally.com` / your-test-password — Google's reviewers will use it)
   - **Ads** — No
   - **Content rating** — fill in the questionnaire (BuddyAlly: social/community, no violence, no gambling — should land at PEGI 3 / Everyone)
   - **Target audience** — 13+ recommended (matches social app norms; under-13 requires COPPA setup which is separate work)
   - **News app** — No
   - **Data safety** — see the table below — paste each row in
   - **Government app** — No
   - **Financial features** — No
   - **Health** — No
   - **Privacy policy URL** — `https://buddyally.com/privacy`
4. **Main store listing** — paste the copy from `play-store-listing.md`
5. **Production release:**
   - Countries/regions: pick where you want to launch (suggest: start with US + Nigeria + UK; expand later)
   - Upload `app-release-bundle.aab`
   - Release name: `1.0.0` (or whatever)
   - Release notes: copy from `play-store-listing.md`
6. Click **Send for review**. First review typically 3–7 days; updates 1–2.

---

## Data Safety form answers (Play Console)

| Data type | Collected? | Shared? | Optional? | Why |
|---|---|---|---|---|
| Name | Yes | No | No | Account |
| Email address | Yes | No | No | Account, login, notifications |
| Phone number | Yes | No | Yes | Optional verification |
| Approximate location | Yes | No | No | Show nearby activities |
| Photos | Yes | No | Yes | Profile + activity covers |
| Messages | Yes | No | No | DM functionality |
| Other user content | Yes | No | No | Activities, comments, reviews |
| App activity | Yes | No | No | Show your hosted/joined activities |
| Crash logs | Yes | No | No | Vercel/Sentry if enabled |

Encryption in transit: **Yes** (HTTPS).
Data deletion: **Yes** — direct users to email `support@buddyally.com` to request account deletion.

---

## Updates after launch

For every code push that should ship to Android:

1. The **PWA itself updates instantly** (it's just `buddyally.com`, the TWA shell loads it live). No Play Store re-submission needed for normal feature work.
2. Only re-build + re-upload the `.aab` if you change something in the **Android shell itself** — package name, signing, app icon, Android-only intents, etc. Those are rare.
3. Bump `app version code` in the Bubblewrap config / PWABuilder dialog (must increase every upload). Version name is human-readable (`1.0.1`).

---

## Troubleshooting

- **"App opens with the address bar showing"** — `assetlinks.json` SHA-256 doesn't match the keystore signature. Re-check, re-deploy, wait 5 min for the CDN, reinstall the app.
- **"Push notifications not arriving in the Android app"** — they go through the same FCM path as the web PWA. Verify the user has tapped "Enable browser push" inside the app at least once.
- **"Play Store rejected for `com.buddyally.app` package name conflict"** — extremely unlikely (we own the namespace conceptually), but if so, fall back to `com.buddyally.android` and rebuild.
- **"Lost the keystore"** — you'll need to publish a new app under a different package name. Always back up the keystore to at least two places (1Password, encrypted iCloud Drive, etc.).
