import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { fileURLToPath } from 'url';
import path from 'path';

// Netlify-friendly Vite config: use mkcert only in dev, plain build for CI
export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';
  return {
    base: '/',
    plugins: [
      ...(isDev
        ? [
            mkcert({
              hosts: ['localhost', '127.0.0.1', process.env.DEV_HOST || '192.168.100.7']
            })
          ]
        : []),
      (() => {
        const jsDir = fileURLToPath(new URL('./Javascript Styles', import.meta.url));
        return viteStaticCopy({
          targets: [
            { src: path.join(jsDir, '**/*'), dest: 'Javascript Styles' }
          ]
        });
      })()
    ],
    server: {
      port: 3000,
      host: true,
      https: isDev,
      open: true,
      headers: {
        'Permissions-Policy': 'camera=(self)'
      }
    },
    preview: {
      port: 3001,
      host: true
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
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
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || (isDev ? 'development' : 'production'))
    }
  };
});