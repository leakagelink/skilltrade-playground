<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Android/iOS Google authentication must use `@capgo/capacitor-social-login` ID-token login with no browser OAuth fallback; browser OAuth is website-only, so native users cannot be stranded outside the app.
- Native Google sign-in must serialize attempts, start with Credential Manager's bottom-sheet flow, and leave stale-state clearing/retry to the social-login plugin to avoid duplicate resets.
- Keep `@capacitor/core` and `@capacitor/android` on the same exact version so native plugin bridges remain compatible.
- Display FCM messages received while the native app is open through Capacitor Local Notifications; Android displays background messages itself.
- Push notifications are sent via direct FCM HTTP v1 using the FIREBASE_SERVICE_ACCOUNT_JSON secret with an RS256 JWT (Web Crypto) — never via the Lovable connector gateway or firebase-admin; stale/UNREGISTERED tokens are deleted after a failed send.
- Admin-only actions (e.g. push broadcasts) check the server-side has_role(auth.uid(), 'admin') security-definer function against the user_roles table; never trust client flags.
- Only the admin route uses a full-width authenticated shell and hides bottom navigation on desktop; all other screens retain their mobile app layout.
- Admin activity reports use server-timestamped, owner-bound foreground days in Asia/Kolkata with profile-cascade deletion; database aggregation checks has_role and never labels signup or device-token counts as installs/downloads.
