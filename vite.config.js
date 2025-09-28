import { defineConfig } from 'vite';

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
    port: 3000,
    host: true,
    https: false, // Disabled for easier local development
    open: true,
    // Enable HTTPS when needed for WebXR/camera features
    // https: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        'virtual-try-on': 'virtual-try-on.html',
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