// Post-build tasks: copy static folders and patch HTML to use original CSS links (ESM compatible)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function copyFolderSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`Skipped: ${path.basename(src)} (not found)`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  console.log(`Copied: ${path.basename(src)} → ${dest}`);
}

function removeHashedCssLinks(html) {
  // Remove any Vite-generated CSS asset links (e.g., /assets/*.css)
  return html.replace(/<link[^>]*href=["']\/assets\/[^"']+["'][^>]*>\s*/gi, '');
}

function injectCssLinks(html, cssFiles) {
  if (!cssFiles || cssFiles.length === 0) return html;
  const links = cssFiles
    .map((file) => `<link rel="stylesheet" href="CSS Styles/${file}">`)
    .join('\n');
  // Insert before </head>
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${links}\n</head>`);
  }
  return `${links}\n${html}`;
}

function extractCssFilesFromSourceHtml(srcHtmlPath) {
  if (!fs.existsSync(srcHtmlPath)) return [];
  const srcHtml = fs.readFileSync(srcHtmlPath, 'utf8');
  const cssFiles = [];
  const regex = /<link[^>]+href=["']CSS Styles\/([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(srcHtml)) !== null) {
    cssFiles.push(match[1]);
  }
  return cssFiles;
}

function patchHtmlCss(distHtmlPath, sourceHtmlPath) {
  if (!fs.existsSync(distHtmlPath)) return;
  const cssFiles = extractCssFilesFromSourceHtml(sourceHtmlPath);
  let html = fs.readFileSync(distHtmlPath, 'utf8');
  const originalHtml = html;
  html = removeHashedCssLinks(html);
  html = injectCssLinks(html, cssFiles);
  if (html !== originalHtml) {
    fs.writeFileSync(distHtmlPath, html, 'utf8');
    console.log(`Patched CSS links in: ${path.basename(distHtmlPath)}`);
  } else {
    console.log(`No CSS changes applied to: ${path.basename(distHtmlPath)}`);
  }
}

(function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const distDir = path.join(projectRoot, 'dist');

  // 1) Copy static folders into dist
  ['Javascript Styles', 'CSS Styles', 'Assets', 'SampleDropdownAssets'].forEach((folderName) => {
    const src = path.join(projectRoot, folderName);
    const dest = path.join(distDir, folderName);
    copyFolderSync(src, dest);
  });

  // 2) Patch all dist HTML files using the original CSS links found in root HTML files
  if (fs.existsSync(distDir)) {
    for (const entry of fs.readdirSync(distDir)) {
      if (entry.toLowerCase().endsWith('.html')) {
        const distHtmlPath = path.join(distDir, entry);
        const sourceHtmlPath = path.join(projectRoot, entry);
        patchHtmlCss(distHtmlPath, sourceHtmlPath);
      }
    }
  }
})();