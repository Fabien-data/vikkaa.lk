import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    setupFiles: ['tests/setup/db.ts'],
    pool: 'forks',
    env: {
      NODE_ENV: 'test',
      PUBLIC_HOST: 'vikkaa.test',
      APP_HOST: 'app.vikkaa.test',
      DATABASE_URL: 'postgres://unused-in-tests',
      APP_SECRET: 'test-secret-test-secret-test-secret-123',
      VIKKAA_PHONE: '+94770000001',
      VIKKAA_WHATSAPP: '+94770000002',
      STAFF_NOTIFY_EMAILS: 'staff@vikkaa.test',
      STORAGE_DIR: './storage-test',
    },
  },
});
