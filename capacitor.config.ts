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
};

export default config;
