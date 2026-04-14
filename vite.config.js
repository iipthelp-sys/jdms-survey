import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// If your GitHub repo is https://github.com/YOUR-USERNAME/jdms-survey
// set base to '/jdms-survey/'
// If you're using a custom domain or a user/org site, use '/'
export default defineConfig({
  plugins: [react()],
  base: '/jdms-survey/',   // ← change this to your repo name
})
