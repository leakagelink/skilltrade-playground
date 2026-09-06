#!/usr/bin/env node
/**
 * One-shot native Android configuration for TradeVirt.
 *
 * Run AFTER `npx cap add android` / `npx cap sync android`.
 * Idempotent: safe to run again after every sync.
 *
 *   node scripts/android-firebase-setup.mjs
 *
 * What it does:
 *  1. copies android-config/google-services.json -> android/app/google-services.json
 *  2. adds the Google Services + Crashlytics Gradle plugins (classpath + apply)
 *  3. adds the AdMob application id meta-data + required permissions to the manifest
 *
 * It never adds Firebase Android SDK dependencies: the Capacitor Firebase
 * plugins already bring those in.
 */
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const p = (...s) => resolve(root, ...s);

const ADMOB_APP_ID = "ca-app-pub-1475323931624357~4494827471";
const PACKAGE_NAME = "online.tradevirt.app";

const androidDir = p("android");
if (!existsSync(androidDir)) {
  console.error(
    "android/ not found. Run `npx cap add android` (then `npx cap sync android`) first.",
  );
  process.exit(1);
}

const log = (m) => console.log(`  ${m}`);
const patch = (file, fn) => {
  const path = p(file);
  if (!existsSync(path)) return log(`SKIP (missing): ${file}`);
  const before = readFileSync(path, "utf8");
  const after = fn(before);
  if (after === before) return log(`ok (already configured): ${file}`);
  writeFileSync(path, after);
  log(`updated: ${file}`);
};

// 1. google-services.json ----------------------------------------------------
const src = p("android-config/google-services.json");
if (!existsSync(src)) {
  console.error("android-config/google-services.json is missing.");
  process.exit(1);
}
const gs = JSON.parse(readFileSync(src, "utf8"));
const pkgs = (gs.client ?? []).map((c) => c.client_info?.android_client_info?.package_name);
if (!pkgs.includes(PACKAGE_NAME)) {
  console.error(
    `google-services.json package mismatch. Expected ${PACKAGE_NAME}, found: ${pkgs.join(", ")}`,
  );
  process.exit(1);
}
copyFileSync(src, p("android/app/google-services.json"));
log(`copied google-services.json -> android/app/ (package ${PACKAGE_NAME})`);

// 2. Gradle ------------------------------------------------------------------
patch("android/build.gradle", (s) => {
  let out = s;
  if (!out.includes("com.google.gms:google-services")) {
    out = out.replace(
      /(classpath\s+['"]com\.android\.tools\.build:gradle[^\n]*\n)/,
      `$1        classpath 'com.google.gms:google-services:4.4.2'\n        classpath 'com.google.firebase:firebase-crashlytics-gradle:3.0.2'\n`,
    );
  }
  return out;
});

patch("android/app/build.gradle", (s) => {
  let out = s;
  if (!out.includes("com.google.gms.google-services")) {
    out += `\napply plugin: 'com.google.gms.google-services'\n`;
  }
  if (!out.includes("com.google.firebase.crashlytics")) {
    out += `apply plugin: 'com.google.firebase.crashlytics'\n`;
  }
  return out;
});

// 3. Manifest ----------------------------------------------------------------
patch("android/app/src/main/AndroidManifest.xml", (s) => {
  let out = s;
  if (!out.includes("com.google.android.gms.ads.APPLICATION_ID")) {
    out = out.replace(
      /(<application[^>]*>)/,
      `$1\n        <meta-data\n            android:name="com.google.android.gms.ads.APPLICATION_ID"\n            android:value="${ADMOB_APP_ID}"/>`,
    );
  }
  for (const perm of [
    "android.permission.INTERNET",
    "com.google.android.gms.permission.AD_ID",
  ]) {
    if (!out.includes(perm)) {
      out = out.replace(
        /(<\/manifest>)/,
        `    <uses-permission android:name="${perm}"/>\n$1`,
      );
    }
  }
  return out;
});

console.log("\nAndroid Firebase + AdMob configuration complete.");
console.log("Next: npx cap open android  ->  Build > Generate Signed Bundle / APK\n");
