import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export default defineConfig({
  plugins: [
    react() as any,
    {
      name: 'esm-sh-resolver',
      enforce: 'pre',
      resolveId(id: string) {
        if (id.startsWith('https://esm.sh/@supabase/supabase-js')) {
          return require.resolve('@supabase/supabase-js');
        }
      },
    },
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
