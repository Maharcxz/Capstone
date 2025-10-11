// Post-build copy: ensure non-module scripts are shipped to dist
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

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const src = path.join(projectRoot, 'Javascript Styles');
  const dest = path.join(projectRoot, 'dist', 'Javascript Styles');
  try {
    await copyDir(src, dest);
    console.log(`[postbuild] Copied "${src}" -> "${dest}"`);
  } catch (err) {
    console.error('[postbuild] Copy failed:', err?.message || err);
    process.exitCode = 1;
  }
}

main();