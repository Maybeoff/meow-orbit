/* Проверка PWA: манифест, установка, офлайн-режим.
   node tools/pwa-test.js [url] [out.png]
   По умолчанию http://localhost:8123/site/
*/
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\imput\\Helium\\Application\\chrome.exe';
const PORT = 9700 + Math.floor(Math.random() * 200);
const URL_ = process.argv[2] || 'http://localhost:8123/site/';
const OUT = process.argv[3] || 'shots/pwa-offline.png';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function httpJson(url, opts) {
  return (await fetch(url, opts)).json();
}

class Client {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', e => rej(e));
    });
    this.ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      }
    });
  }
  send(method, params) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('timeout ' + method)); } }, 30000);
    });
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
    return r.result && r.result.value;
  }
  close() { try { this.ws.close(); } catch (e) { } }
}

(async () => {
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mo-pwa-'));
  const proc = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--hide-scrollbars', '--mute-audio',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + userDir, 'about:blank'
  ], { stdio: 'ignore' });

  let version = null;
  for (let i = 0; i < 60; i++) {
    try { version = await httpJson('http://127.0.0.1:' + PORT + '/json/version'); if (version) break; } catch (e) { }
    await sleep(200);
  }
  if (!version) throw new Error('chrome did not start');

  const target = await httpJson('http://127.0.0.1:' + PORT + '/json/new', { method: 'PUT' }).catch(() =>
    httpJson('http://127.0.0.1:' + PORT + '/json/new'));
  const c = new Client(target.webSocketDebuggerUrl);
  await c.ready;
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  await c.send('Network.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

  await c.send('Page.navigate', { url: URL_ });
  await sleep(3000);

  const manifest = await c.send('Page.getAppManifest').catch(e => ({ errors: [{ message: e.message }] }));
  console.log('MANIFEST ' + JSON.stringify({
    url: manifest.url,
    errors: (manifest.errors || []).map(e => e.message || e)
  }));

  const inst = await c.send('Page.getInstallabilityErrors').catch(e => ({ installabilityErrors: [{ errorId: 'n/a', errorArguments: [{ name: 'message', value: e.message }] }] }));
  console.log('INSTALL ' + JSON.stringify((inst.installabilityErrors || []).map(e => e.errorId)));

  const sw = await c.eval(`(async function(){
    try {
      var reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise(function(_, rej){ setTimeout(function(){ rej(new Error('timeout')); }, 10000); })
      ]);
      var keys = await caches.keys();
      var n = 0;
      if (keys[0]) { n = (await (await caches.open(keys[0])).keys()).length; }
      return JSON.stringify({ active: !!reg.active, scope: reg.scope, cache: keys[0] || null, cached: n });
    } catch (e) { return JSON.stringify({ error: e.message }); }
  })()`);
  console.log('SW ' + sw);

  // офлайн
  await c.send('Network.emulateNetworkConditions', {
    offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1
  });
  await c.send('Page.reload', { ignoreCache: false });
  await sleep(3500);

  const off = await c.eval(`JSON.stringify({
    title: document.title,
    canvas: !!document.getElementById('game'),
    ui: typeof window.UI,
    menu: document.getElementById('scr-menu') && document.getElementById('scr-menu').classList.contains('show'),
    swController: !!navigator.serviceWorker.controller
  })`);
  console.log('OFFLINE ' + off);

  const shot = await c.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log('saved ' + OUT);

  c.close();
  try { proc.kill(); } catch (e) { }
  await sleep(300);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) { }
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
