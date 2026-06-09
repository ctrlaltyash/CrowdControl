import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// lowkey dis is where the magic happens fr fr
// no cap vite is the goat for bundling dis mess
// https://vite.dev/config/
export default defineConfig({
  // we usin react bc we basic like dat
  plugins: [react()],
})
