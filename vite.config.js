import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: './',
  plugins: [svelte()],
  server: {
    port: parseInt(process.env.PORT || '4601'),
    host: '0.0.0.0'
  },
  preview: {
    port: parseInt(process.env.PORT || '4601'),
    host: '0.0.0.0'
  }
});
