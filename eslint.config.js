import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// yo dis is the hall monitor for our code
// keepin it chill and catchin all the Ls we might take
export default defineConfig([
  // ignore the dist folder... it's just vibin
  globalIgnores(['dist']),
  {
    // we only checkin ts and tsx files fr
    files: ['**/*.{ts,tsx}'],
    // stackin up the rules like pancakes
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    // settin the language vibes
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
