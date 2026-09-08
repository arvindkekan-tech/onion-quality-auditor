import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.onivis.app',
  appName: 'ONIVIS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
