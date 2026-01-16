import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from parent directory (root)
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');

  const vitePort = parseInt(env.VITE_PORT || '5173', 10);
  const wsPort = parseInt(env.PORT || '3001', 10);

  return {
    plugins: [react()],
    server: {
      port: vitePort,
    },
    define: {
      'import.meta.env.VITE_WS_PORT': JSON.stringify(wsPort),
    },
  };
});
