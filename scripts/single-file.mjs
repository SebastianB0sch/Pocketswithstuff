/**
 * Turns the Vite build in dist/ into one self-contained HTML file
 * (dist/pockets-with-stuff.html): the script and styles are inlined and the two
 * fonts load from Google Fonts instead of bundled files. Run after `vite build`.
 *
 *   node scripts/single-file.mjs [distDir] [--fragment]
 *
 * --fragment writes the page without <html>/<head>/<body> wrappers, for hosts that
 * add their own document skeleton.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const fragment = args.includes('--fragment');
const dist = args.find((a) => !a.startsWith('--')) ?? 'dist';
const assets = join(dist, 'assets');
const files = readdirSync(assets);
const js = files.filter((f) => f.endsWith('.js'));
if (js.length !== 1) throw new Error(`Expected one script chunk, found ${js.length}`);
const script = readFileSync(join(assets, js[0]), 'utf8').replaceAll('</script', '<\\/script');
const css = files
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(join(assets, f), 'utf8'))
  .join('\n')
  // The bundled @font-face rules point at files that are not shipped here.
  .replace(/@font-face\s*{[^}]*}/g, '');

const fonts = 'https://fonts.googleapis.com/css2?family=Nunito:wght@600;800&family=Pixelify+Sans:wght@700&display=swap';
const body = `<div id="game"><canvas id="world"></canvas><canvas id="ui"></canvas></div>
<script type="module">${script}</script>`;
const head = `<title>Pockets with Stuff</title>
<meta name="theme-color" content="#10131a">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fonts}">
<style>${css}</style>`;

const out = fragment
  ? `${head}\n${body}\n`
  : `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
${head}
</head>
<body>
${body}
</body>
</html>
`;
const name = fragment ? 'pockets-with-stuff.fragment.html' : 'pockets-with-stuff.html';
writeFileSync(join(dist, name), out);
console.log(`${join(dist, name)}: ${(out.length / 1024).toFixed(0)} KiB`);
