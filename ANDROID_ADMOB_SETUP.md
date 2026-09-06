# TradeVirt — Android + AdMob setup (Version 2.0)

The `android/` folder is generated on your machine (it is not stored in the repo).
All commands below are Windows PowerShell.

## 1. Pull the latest code and install

```powershell
cd C:\Users\ASUS\skilltrade-playground
git pull
npm install
```

## 2. Generate / refresh the Android project

```powershell
npx cap add android      # only the first time
npx cap sync android
```

Package name: `online.tradevirt.app` — this must match the package name
registered in your Google AdMob app.

## 3. Verify the AdMob App ID in the manifest

`npx cap sync` adds the Google Mobile Ads plugin, but the App ID must be
declared once in `android\app\src\main\AndroidManifest.xml`, inside
`<application>`:

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-1475323931624357~4494827471"/>
```

Also confirm these permissions exist in the same manifest:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="com.google.android.gms.permission.AD_ID"/>
```

## 4. Gradle

`android\app\build.gradle` must use `minSdkVersion 23` or higher (Capacitor 8
defaults to 23) and `compileSdkVersion 34+`. The AdMob dependency is added
automatically by the `@capacitor-community/admob` plugin — no manual entry
required.

## 5. Build

```powershell
npx cap open android
```

Then in Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**.

## Ad units used by the app

| Purpose | Unit |
| --- | --- |
| App ID | `ca-app-pub-1475323931624357~4494827471` |
| Rewarded | `ca-app-pub-1475323931624357/7892970831` |
| Interstitial | `ca-app-pub-1475323931624357/2850573316` |

Non-production builds automatically use Google's official test units, so your
own device traffic never hits the live units.

## app-ads.txt

Already served at `https://tradevirt.online/app-ads.txt`.
