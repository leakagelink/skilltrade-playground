import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.tradevirt.app',
  appName: 'TradeVirt',
  webDir: 'capacitor-web',
  server: {
    url: 'https://tradevirt.online',
    androidScheme: 'https',
    cleartext: false,
  },
  backgroundColor: '#fafbfc',
  plugins: {
    // Native splash shows instantly on launch and stays until the live site
    // has rendered (the web app calls SplashScreen.hide()), so users never see
    // a blank white WebView while tradevirt.online loads.
    SplashScreen: {
      launchShowDuration: 10000,
      launchAutoHide: true,
      backgroundColor: '#fafbfc',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'small',
      spinnerColor: '#2563eb',
      splashFullScreen: false,
      splashImmersive: false,
    },
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
      logLevel: 1,
    },
  },
};

export default config;
