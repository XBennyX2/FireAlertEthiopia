import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.firealert.app',
  appName: 'FireAlert',
  webDir: 'build', // Change this to 'dist' if you are using Vite instead of Create React App
  server: {
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true
  }
};

export default config;