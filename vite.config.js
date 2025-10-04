import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// Simple utility to copy directories recursively (used during build)
function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest);
    } else if (entry.isFile()) {
      fs.copyFileSync(src, dest);
    }
  }
}

export default defineConfig({
  plugins: [
    {
      name: 'copy-static-directories',
      apply: 'build',
      closeBundle() {
        const projectRoot = process.cwd();
        const outDir = path.resolve(projectRoot, 'dist');
        const staticDirs = [
          'Javascript Styles',
          'CSS Styles'
        ];
        staticDirs.forEach((dir) => {
          const src = path.resolve(projectRoot, dir);
          const dest = path.resolve(outDir, dir);
          try {
            copyDir(src, dest);
            // eslint-disable-next-line no-console
            console.log(`[copy-static] Copied '${dir}' to dist`);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(`[copy-static] Skipped '${dir}':`, e && e.message ? e.message : e);
          }
        });
      }
    }
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