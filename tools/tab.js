/* Открыть URL в новой вкладке уже запущенного браузера (CDP 9222) и выполнить выражение.
   node tools/tab.js "<url>" "<js>" [waitMs] [keep]
   keep = 1 — оставить вкладку открытой.
*/
const PORT = Number(process.env.CDP_PORT || 9222);
const URL_ = process.argv[2];
const EXPR = process.argv[3] || 'document.title';
const WAIT = Number(process.argv[4] || 4000);
const KEEP = process.argv[5] === '1';
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  close() { try { this.ws.close(); } catch (e) { } }
}

(async () => {
  const version = await (await fetch('http://127.0.0.1:' + PORT + '/json/version')).json();
  const bc = new Client(version.webSocketDebuggerUrl);
  await bc.ready;
  const { targetId } = await bc.send('Target.createTarget', { url: 'about:blank' });
  await sleep(300);
  const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
  const page = list.filter(t => t.id === targetId)[0];
  const c = new Client(page.webSocketDebuggerUrl);
  await c.ready;
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  await c.send('Page.navigate', { url: URL_ });
  await sleep(WAIT);
  const r = await c.send('Runtime.evaluate', { expression: EXPR, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) console.log('EXC ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
  console.log('RESULT ' + JSON.stringify(r.result && r.result.value));
  if (!KEEP) await bc.send('Target.closeTarget', { targetId }).catch(() => {});
  c.close(); bc.close();
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
