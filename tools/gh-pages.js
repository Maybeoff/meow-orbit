/* Обновить ветку gh-pages содержимым папки site/ (без переключения рабочей копии).
   node tools/gh-pages.js [папка] [сообщение]
*/
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.resolve(ROOT, process.argv[2] || 'site');
const MSG = process.argv[3] || 'gh-pages: PWA build (Meow Orbit)';

function git(args, input) {
  return execFileSync('git', args, { cwd: ROOT, input: input, encoding: 'utf8' }).trim();
}

function walk(dir) {
  const entries = [];
  for (const name of fs.readdirSync(dir).sort()) {
    if (name === '.git') continue;
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      entries.push({ name, type: 'tree', sha: walk(abs) });
    } else {
      const sha = git(['hash-object', '-w', abs]);
      entries.push({ name, type: 'blob', sha, mode: '100644' });
    }
  }
  const lines = entries.map(e =>
    (e.type === 'tree' ? '040000 tree ' : e.mode + ' blob ') + e.sha + '\t' + e.name + '\n'
  ).join('');
  return git(['mktree'], lines);
}

if (!fs.existsSync(path.join(SRC, 'index.html'))) {
  console.error('нет ' + path.join(SRC, 'index.html') + ' — сначала node tools/build.js');
  process.exit(1);
}

// .nojekyll, чтобы Pages не трогал файлы через Jekyll
fs.writeFileSync(path.join(SRC, '.nojekyll'), '');

const tree = walk(SRC);
const commit = git(['commit-tree', tree, '-m', MSG]);
git(['branch', '-f', 'gh-pages', commit]);
console.log('gh-pages -> ' + commit + ' (tree ' + tree + ')');
