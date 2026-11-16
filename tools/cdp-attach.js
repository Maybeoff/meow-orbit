/* Подключение к уже запущенному Chrome/Helium по CDP (--remote-debugging-port=9222).
   node tools/cdp-attach.js list
   node tools/cdp-attach.js nav <url> [index]
   node tools/cdp-attach.js eval "<js>" [index]
   node tools/cdp-attach.js shot <out.png> [index]
   node tools/cdp-attach.js click <x> <y> [index]
   node tools/cdp-attach.js type "<text>" [index]
   index — номер вкладки (по умолчанию 0)
*/
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.CDP_PORT || 9222);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function targets() {
  const res = await fetch('http://127.0.0.1:' + PORT + '/json/list');
  return res.json();
}

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

async function main() {
  const mode = process.argv[2] || 'list';
  const list = await targets();
  const pages = list.filter(t => t.type === 'page');
  if (mode === 'list') {
    pages.forEach((p, i) => console.log(i, '|', p.title.slice(0, 70), '|', p.url.slice(0, 90)));
    return;
  }
  const idxArg = { shot: 4, click: 5, nav: 4, eval: 4, type: 4 }[mode];
  const idx = Number(process.argv[idxArg] || 0);
  const page = pages[idx];
  if (!page) throw new Error('no such page: ' + idx);
  const c = new Client(page.webSocketDebuggerUrl);
  await c.ready;
  await c.send('Page.enable');
  await c.send('Runtime.enable');

  if (mode === 'nav') {
    await c.send('Page.navigate', { url: process.argv[3] });
    await sleep(3500);
    const r = await c.send('Runtime.evaluate', { expression: 'location.href', returnByValue: true });
    console.log('URL ' + r.result.value);
  } else if (mode === 'eval') {
    const r = await c.send('Runtime.evaluate', { expression: process.argv[3], awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) console.error('EVAL ERROR', JSON.stringify(r.exceptionDetails).slice(0, 800));
    console.log('EVAL ' + JSON.stringify(r.result && r.result.value));
  } else if (mode === 'shot') {
    const out = process.argv[3] || 'shots/attach.png';
    const shot = await c.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
    console.log('saved ' + out);
  } else if (mode === 'click') {
    const x = Number(process.argv[3]), y = Number(process.argv[4]);
    await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    await sleep(1200);
    console.log('clicked ' + x + ',' + y);
  } else if (mode === 'type') {
    const text = process.argv[3] || '';
    await c.send('Input.insertText', { text });
    await sleep(300);
    console.log('typed');
  }
  c.close();
  process.exit(0);
}

main().catch(e => { console.error('ERR', e.message); process.exit(1); });
