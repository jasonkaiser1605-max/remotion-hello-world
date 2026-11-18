// Builds the website version of IronPath for GitHub Pages and makes it installable
// on the iPhone home screen ("Add to Home Screen" in Safari).
//
//   npm run build:web                    → ../docs (served by GitHub Pages)
//   WEB_BASE=/my-repo npm run build:web  → for a different repo name
import { execSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.env.WEB_BASE ?? '/remotion-hello-world').replace(/\/$/, '');
const dist = join(root, 'dist');
const out = process.env.WEB_OUT ?? join(root, '..', 'docs');

rmSync(dist, { recursive: true, force: true });
execSync('npx expo export --platform web --output-dir dist', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, EXPO_BASE_URL: base },
});

// Icons + manifest
for (const f of ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
  copyFileSync(join(root, 'assets/web', f), join(dist, f));
}
const BG = '#0B0F14';
writeFileSync(
  join(dist, 'manifest.webmanifest'),
  JSON.stringify(
    {
      name: 'IronPath: Ironman Coach',
      short_name: 'IronPath',
      description: 'Your first-Ironman training plan, fueling and recovery coach.',
      start_url: `${base}/`,
      scope: `${base}/`,
      display: 'standalone',
      orientation: 'portrait',
      background_color: BG,
      theme_color: BG,
      icons: [
        { src: `${base}/icon-192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${base}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    null,
    2,
  ),
);

// Home-screen web-app tags, dark background, safe-area aware viewport.
const indexPath = join(dist, 'index.html');
let html = readFileSync(indexPath, 'utf8');
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />',
);
html = html.replace(
  '</head>',
  [
    `<meta name="description" content="IronPath: first-Ironman training plan, fueling and recovery coach." />`,
    `<meta name="theme-color" content="${BG}" />`,
    `<meta name="apple-mobile-web-app-capable" content="yes" />`,
    `<meta name="mobile-web-app-capable" content="yes" />`,
    `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`,
    `<meta name="apple-mobile-web-app-title" content="IronPath" />`,
    `<link rel="apple-touch-icon" href="${base}/apple-touch-icon.png" />`,
    `<link rel="manifest" href="${base}/manifest.webmanifest" />`,
    `<style>html,body{background:${BG};}</style>`,
    '</head>',
  ].join('\n'),
);
writeFileSync(indexPath, html);
// GitHub Pages: serve the app for deep links (e.g. /plan after a reload) and skip Jekyll,
// which would otherwise hide the _expo folder.
copyFileSync(indexPath, join(dist, '404.html'));
writeFileSync(join(dist, '.nojekyll'), '');

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
cpSync(dist, out, { recursive: true });
console.log(`\nWebsite built for ${base}/ → ${out}`);
