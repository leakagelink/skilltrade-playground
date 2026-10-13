package online.tradevirt.app;

import com.facebook.FacebookSdk;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Minimal Meta App Events bridge. Only logs what the JS allow-list sends. */
@CapacitorPlugin(name = "MetaEvents")
public class MetaEventsPlugin extends Plugin {

    /** Collection stays disabled until a separate Meta-specific consent flow exists. */
    @Override
    public void load() {
        try {
            FacebookSdk.setAutoLogAppEventsEnabled(false);
            FacebookSdk.setAdvertiserIDCollectionEnabled(false);
            FacebookSdk.setAutoInitEnabled(false);
        } catch (Throwable ignored) {
            // Meta must never crash TradeVirt.
        }
    }

    @PluginMethod
    public void logEvent(PluginCall call) {
        // Preserve bridge compatibility but never initialize or send Meta events.
        call.resolve();
    }
}
