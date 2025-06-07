import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

export default defineConfig({
  integrations: [tailwind()],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  vite: {
    build: {
      rollupOptions: {
        output: {
          // Add hashes to asset filenames for better caching
          assetFileNames: 'assets/[name].[hash][extname]'
        }
      }
    }
  }
});