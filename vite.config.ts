import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration file for the CrowdControl frontend.
// Handles bundling and development server setup.
// https://vite.dev/config/
export default defineConfig({
  // Enable React support for JSX and Fast Refresh.
  plugins: [react()],
})
