import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.tradevirt.app',
  appName: 'TradeVirt',
  webDir: '.output/public',
  server: {
    androidScheme: 'https',
  },
};

export default config;
