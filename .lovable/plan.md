# Fix native Google sign-in scope error

## Change
- Remove the explicit Google `email` and `profile` scopes from native login. The installed plugin already requests `openid`, `email`, and `profile` by default.
- Keep native ID-token login and the no-browser-fallback rule unchanged.

## Verification
- Confirm TypeScript and preview build pass.
- Re-check the installed plugin source to ensure the MainActivity guard is no longer reached.
- Provide the exact Android rebuild steps needed to place the fix on the test phone.
