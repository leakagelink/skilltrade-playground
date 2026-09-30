# Fix push notifications not appearing

## What will change
- Keep the existing Firebase push registration and delivery flow.
- Add foreground notification handling so a received push is visibly shown while TradeVirt is open.
- Preserve normal Android system notifications while the app is backgrounded or closed.
- Remove the temporary test-send function from user-facing app code after verification.

## Verification
- Confirm the project builds successfully.
- Confirm the registered Android token remains current.
- Provide fresh APK rebuild/sync steps; Play Store or AAB upload will not be required for testing.

## Technical details
- Use Capacitor's native local-notification support only to display an FCM message received in the foreground.
- Keep notification channels and permission behavior aligned with the existing `tradevirt_default` Android channel.
- Do not use Lovable AI or AI credits.
