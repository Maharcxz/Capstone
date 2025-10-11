// Post-build copy: ensure non-module scripts are shipped to dist
// Enhanced for Netlify compatibility
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function copyDir(srcDir, destDir) {
  await fs.mkdir(destDir, { recursive: true });
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function ensureCssConsistency() {
  const projectRoot = path.resolve(__dirname, '..');
  const cssDir = path.join(projectRoot, 'dist', 'CSS Styles');
  const assetsCssDir = path.join(projectRoot, 'dist', 'assets', 'CSS Styles');
  
  try {
    // Make sure CSS Styles directory exists
    await fs.mkdir(cssDir, { recursive: true });
    
    // Check if Vite moved CSS files to assets
    if (await fs.stat(assetsCssDir).catch(() => false)) {
      const files = await fs.readdir(assetsCssDir);
      for (const file of files) {
        if (file.endsWith('.css')) {
          const srcPath = path.join(assetsCssDir, file);
          const destPath = path.join(cssDir, file);
          await fs.copyFile(srcPath, destPath);
          console.log(`[postbuild] Copied CSS "${file}" for path consistency`);
        }
      }
    }
  } catch (err) {
    console.error('[postbuild] CSS consistency check failed:', err?.message || err);
  }
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const src = path.join(projectRoot, 'Javascript Styles');
  const dest = path.join(projectRoot, 'dist', 'Javascript Styles');
  
  try {
    // Copy JavaScript files
    await copyDir(src, dest);
    console.log(`[postbuild] Copied "${src}" -> "${dest}"`);
    
    // Ensure CSS consistency
    await ensureCssConsistency();
    
    console.log('[postbuild] All post-build tasks completed successfully');
  } catch (err) {
    console.error('[postbuild] Process failed:', err?.message || err);
    process.exitCode = 1;
  }
}

main();