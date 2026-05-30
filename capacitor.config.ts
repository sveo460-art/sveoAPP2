import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.react.chat',
  appName: 'Private Chat',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  }
};

export default config;
