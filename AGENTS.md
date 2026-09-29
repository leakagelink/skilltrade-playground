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
- Native Google sign-in must serialize attempts and clear stale Credential Manager state before showing the standard account picker, preventing duplicate pickers and re-authentication loops.
