import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base must match the GitHub Pages sub-path: https://<user>.github.io/<repo>/
export default defineConfig({
  plugins: [react()],
  base: '/nvidia-infra-aii-certificate-training/',
})
