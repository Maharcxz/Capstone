import { defineConfig } from 'vite';
import fs from 'node:fs';

export default defineConfig({
  // Temporarily remove legacy plugin to fix ES module loading
  // plugins: [
  //   legacy({
  //     targets: ['defaults', 'not IE 11'],
  //     modernPolyfills: true,
  //     renderLegacyChunks: false // Only generate modern builds in dev
  //   })
  // ],
  server: {
    // Enable LAN access and secure context for mobile (camera/WebXR)
    host: true,
    // Use custom cert if present (ssl/server.key, ssl/server.crt), otherwise default self-signed
    https: (fs.existsSync('ssl/server.key') && fs.existsSync('ssl/server.crt'))
      ? { key: fs.readFileSync('ssl/server.key'), cert: fs.readFileSync('ssl/server.crt') }
      : true,
    port: 3004,
    strictPort: true,
    open: false
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        'try-on': 'try-on.html',
        'admin-dashboard': 'admin-dashboard.html',
        about: 'about.html',
        contact: 'contact.html',
        preorder: 'preorder.html',
        preorders: 'preorders.html',
        'preorder-confirmation': 'preorder-confirmation.html'
      }
    }
  },
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  optimizeDeps: {
    include: ['three']
  },
  define: {
    // Enable WebXR polyfill if needed
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});