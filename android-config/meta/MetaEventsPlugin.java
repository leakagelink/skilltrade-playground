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

    /**
     * The SDK auto-initialises via its ContentProvider (from manifest meta-data).
     * Because AutoLogAppEventsEnabled=false, we activate the app ONCE here so Meta
     * still receives install/activation events needed for ads attribution.
     */
    @Override
    public void load() {
        try {
            android.app.Application app = (android.app.Application) getContext().getApplicationContext();
            if (!FacebookSdk.isInitialized()) FacebookSdk.sdkInitialize(app);
            FacebookSdk.setAutoLogAppEventsEnabled(false);
            FacebookSdk.setAdvertiserIDCollectionEnabled(true);
            AppEventsLogger.activateApp(app);
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
        try {
            String name = call.getString("name");
            if (name == null || name.isEmpty()) { call.resolve(); return; }
            Bundle bundle = new Bundle();
            JSObject params = call.getObject("params", new JSObject());
            Iterator<String> keys = params.keys();
            while (keys.hasNext()) {
                String k = keys.next();
                String v = params.optString(k, null);
                if (v != null) bundle.putString(k, v);
            }
            logger().logEvent(name, bundle);
        } catch (Throwable ignored) {
            // Meta must never crash TradeVirt.
        }
        call.resolve();
    }
}
