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
