/* Сборка однофайловой версии игры (CSS и JS встраиваются в index.html)
   + PWA-сайт для GitHub Pages (site/: index.html, manifest, sw, иконки).
   node tools/build.js            -> dist/index.html + site/ + zip
   node tools/build.js --nozip
*/
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE = path.join(ROOT, 'site');

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

let html = read('index.html');
const css = read('css/style.css');

if (/<\/script/i.test(html.replace(/<script[\s\S]*?<\/script>/gi, ''))) {
  console.warn('warning: html contains </script sequence');
}

// инлайн CSS
html = html.replace(/<link\s+rel="stylesheet"\s+href="css\/style.css"\s*\/?>/i,
  '<style>\n' + css + '\n</style>');

// инлайн скриптов
html = html.replace(/<script\s+src="([^"]+)"><\/script>/gi, function (m, src) {
  const file = path.join(ROOT, src.replace(/^\//, ''));
  let js = fs.readFileSync(file, 'utf8');
  if (/<\/script/i.test(js)) js = js.replace(/<\/script/gi, '<\\/script');
  return '<script>\n' + js + '\n</script>';
});

if (/src="(js|css)\//.test(html) || /href="css\//.test(html)) {
  throw new Error('остались относительные ссылки на css/js');
}

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');
console.log('dist/index.html ' + Math.round(html.length / 1024) + ' KB');

// PWA-сайт для GitHub Pages: однофайловый index.html + манифест, service worker, иконки
const version = crypto.createHash('sha1').update(html).digest('hex').slice(0, 10);
fs.rmSync(SITE, { recursive: true, force: true });
fs.mkdirSync(SITE, { recursive: true });
fs.writeFileSync(path.join(SITE, 'index.html'), html, 'utf8');
fs.copyFileSync(path.join(ROOT, 'manifest.webmanifest'), path.join(SITE, 'manifest.webmanifest'));

let sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
if (sw.indexOf("'__BUILD__'") < 0) throw new Error('sw.js: не найден маркер __BUILD__');
sw = sw.replace("'__BUILD__'", "'" + version + "'");
fs.writeFileSync(path.join(SITE, 'sw.js'), sw, 'utf8');

fs.cpSync(path.join(ROOT, 'icons'), path.join(SITE, 'icons'), { recursive: true });
fs.mkdirSync(path.join(SITE, 'assets'), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, 'assets'))) {
  if (/^shot-\d-.*\.png$/.test(f)) {
    fs.copyFileSync(path.join(ROOT, 'assets', f), path.join(SITE, 'assets', f));
  }
}
console.log('site/ ' + version + ' (index.html, manifest, sw, icons, скриншоты)');

if (process.argv.indexOf('--nozip') < 0) {
  const zip = path.join(ROOT, 'meow-orbit.zip');
  if (fs.existsSync(zip)) fs.unlinkSync(zip);
  // python zipfile пишет пути с прямыми слэшами
  const py = [
    'import zipfile',
    'z = zipfile.ZipFile(r"' + zip + '", "w", zipfile.ZIP_DEFLATED)',
    'z.write(r"' + path.join(DIST, 'index.html') + '", "index.html")',
    'z.close()',
    'print("zip ok")'
  ].join('\n');
  const script = path.join(DIST, '_zip.py');
  fs.writeFileSync(script, py, 'utf8');
  execFileSync('python', [script], { stdio: 'inherit' });
  fs.unlinkSync(script);
  const st = fs.statSync(zip);
  console.log('meow-orbit.zip ' + Math.round(st.size / 1024) + ' KB');
}
