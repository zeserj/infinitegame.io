import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

export default defineConfig({
  integrations: [tailwind()],
  output: 'static', // Changed from 'hybrid' to 'server'
  adapter: node({
    mode: 'standalone' // This mode works best with Coolify
  })
});