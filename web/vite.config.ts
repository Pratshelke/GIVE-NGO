import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build`         → normal static site in dist/ (deploy anywhere: Netlify, Vercel, GitHub Pages)
// `npm run build:single`  → one self-contained dist-single/index.html you can email or open offline
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  build: mode === 'single' ? { outDir: 'dist-single' } : {},
}))
