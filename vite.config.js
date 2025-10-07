import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  plugins: [
    // Generate locally trusted certificates for HTTPS dev/preview
    mkcert({
      hosts: ['localhost', '127.0.0.1', process.env.DEV_HOST || '192.168.100.7']
    })
  ],
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
    https: true,
    open: true,
    headers: {
      'Permissions-Policy': 'camera=(self)'
    }
    // Enable HTTPS when needed for WebXR/camera features
    // https: true
  },
  preview: {
    port: 3001,
    host: true,
    https: true
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