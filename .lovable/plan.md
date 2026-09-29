# Fix Android Google sign-in

## Goal
Make **Continue with Google** use Android’s native Google account picker and return directly to TradeVirt, without opening the Lovable/browser OAuth flow.

## Changes
- Replace the indirect plugin lookup with the installed Google social-login plugin’s official native API.
- On Android/iOS, never fall back to browser OAuth when native setup fails; show a clear error instead.
- Keep browser OAuth only for visitors using the TradeVirt website, with `https://tradevirt.online` as its return destination.
- Enable only Google in the native social-login configuration and preserve the existing package ID.
- Remove the browser-callback workaround from the native flow so there is one reliable login path.

## Verification
- Confirm the project builds successfully.
- Verify the website still starts Google sign-in with the TradeVirt return URL.
- Provide the exact rebuild/sync steps required because native plugin configuration changes need a fresh Android build.

## Technical details
The Android app will authenticate using a Google ID token from the native account picker, then create the TradeVirt session directly. Browser OAuth will remain a website-only path.
