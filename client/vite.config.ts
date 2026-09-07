import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const clientRoot = fileURLToPath(new URL('.', import.meta.url))
const serverSource = fileURLToPath(new URL('../src', import.meta.url))
const outDir = fileURLToPath(new URL('../dist/client', import.meta.url))

/** Where `npm run dev:client` forwards API calls while Vite serves the UI. */
const apiTarget = process.env.MEMBRANE_API_URL ?? 'http://localhost:3000'

export default defineConfig({
  root: clientRoot,
  plugins: [react()],
  resolve: {
    // Lets the client reuse the server's transport-neutral Zod contracts.
    alias: { '@server': serverSource },
  },
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/health': apiTarget,
      '/mcp': apiTarget,
      '/docs': apiTarget,
    },
  },
})
