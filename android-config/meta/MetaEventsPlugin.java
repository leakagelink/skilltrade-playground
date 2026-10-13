package online.tradevirt.app;

import android.os.Bundle;
import com.facebook.FacebookSdk;
import com.facebook.appevents.AppEventsLogger;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Iterator;

/** Minimal Meta App Events bridge. Only logs what the JS allow-list sends. */
@CapacitorPlugin(name = "MetaEvents")
public class MetaEventsPlugin extends Plugin {
    private AppEventsLogger logger;

    /** Collection stays disabled until a separate Meta-specific consent flow exists. */
    @Override
    public void load() {
        try {
            android.app.Application app = (android.app.Application) getContext().getApplicationContext();
            FacebookSdk.setAutoLogAppEventsEnabled(false);
            FacebookSdk.setAdvertiserIDCollectionEnabled(false);
            FacebookSdk.setAutoInitEnabled(false);
        } catch (Throwable ignored) {
            // Meta must never crash TradeVirt.
        }
    }

    private AppEventsLogger logger() {
        if (logger == null) {
            logger = AppEventsLogger.newLogger(getContext().getApplicationContext());
        }
        return logger;
    }

    @PluginMethod
    public void logEvent(PluginCall call) {
        // Preserve bridge compatibility but never initialize or send Meta events.
        call.resolve();
    }
}
