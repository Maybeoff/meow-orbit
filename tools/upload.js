/* Загрузка файлов в поля консоли Яндекс Игр через CDP (порт 9222).
   node tools/upload.js "input[name=icon]" assets/icon-512.png
   node tools/upload.js "input[name=screenshots-desktop]" assets/a.png assets/b.png
*/
const path = require('path');
const fs = require('fs');

const PORT = Number(process.env.CDP_PORT || 9222);
const selector = process.argv[2];
const files = process.argv.slice(3).map(f => path.resolve(f));

for (const f of files) {
  if (!fs.existsSync(f)) { console.error('missing file: ' + f); process.exit(1); }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

class Client {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', (e) => rej(e));
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }
  send(method, params) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('timeout: ' + method)); }
      }, 30000);
    });
  }
  close() { try { this.ws.close(); } catch (e) { } }
}

(async () => {
  const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
  const pages = list.filter(t => t.type === 'page');
  const page = pages.filter(t => /games\.yandex\.ru\/console/.test(t.url))[0] || pages[0];
  const c = new Client(page.webSocketDebuggerUrl);
  await c.ready;
  await c.send('DOM.enable');
  await c.send('Runtime.enable');

  const doc = await c.send('DOM.getDocument', { depth: -1, pierce: true });
  const q = await c.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
  if (!q.nodeId) throw new Error('selector not found: ' + selector);
  await c.send('DOM.setFileInputFiles', { files, nodeId: q.nodeId });
  await sleep(1500);
  const r = await c.send('Runtime.evaluate', {
    expression: `(function(){var e=document.querySelector(${JSON.stringify(selector)});return e?(e.files?e.files.length:'no-files')+' | '+(e.value||''):'no el';})()`,
    returnByValue: true
  });
  console.log('UPLOAD ' + selector + ' -> ' + (r.result && r.result.value));
  c.close();
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
