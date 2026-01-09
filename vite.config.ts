
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Prioritize env vars found in loadEnv, fallback to process.env (system vars in Vercel)
  const apiKey = env.API_KEY || process.env.API_KEY || '';

  return {
    plugins: [react()],
    define: {
      // This ensures process.env.API_KEY is replaced with the actual string during build
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  };
});
