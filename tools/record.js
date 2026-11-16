/* Запись геймплейного видео через tools/recorder.html в уже запущенном браузере (CDP 9222).
   node tools/record.js <w> <h> <secs> <out.mp4> [logo1] [logo2]
   Открывает новую вкладку, пишет видео, сохраняет файл в assets/video/out.mp4, закрывает вкладку.
*/
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.CDP_PORT || 9222);
const W = Number(process.argv[2] || 1280);
const H = Number(process.argv[3] || 720);
const SECS = Number(process.argv[4] || 18);
const OUT = path.resolve(process.argv[5] || 'assets/video/gameplay.mp4');
const LOGO1 = process.argv[6] || 'МЯУ';
const LOGO2 = process.argv[7] || 'ОРБИТА';
const DL = path.dirname(OUT);
const NAME = path.basename(OUT);

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
  fs.mkdirSync(DL, { recursive: true });
  const version = await (await fetch('http://127.0.0.1:' + PORT + '/json/version')).json();
  const bc = new Client(version.webSocketDebuggerUrl);
  await bc.ready;

  const url = 'http://localhost:8123/tools/recorder.html?w=' + W + '&h=' + H + '&secs=' + SECS +
    '&name=' + encodeURIComponent(NAME) +
    '&logo1=' + encodeURIComponent(LOGO1) + '&logo2=' + encodeURIComponent(LOGO2);

  const { targetId } = await bc.send('Target.createTarget', { url: 'about:blank' });
  await sleep(400);

  const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
  const page = list.filter(t => t.id === targetId)[0] || list.filter(t => t.type === 'page').slice(-1)[0];
  const c = new Client(page.webSocketDebuggerUrl);
  await c.ready;
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  await c.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL }).catch(async () => {
    await c.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL }).catch(() => {});
  });
  await c.send('Page.navigate', { url });

  let st = '';
  const t0 = Date.now();
  while (Date.now() - t0 < (SECS + 60) * 1000) {
    await sleep(1500);
    const r = await c.send('Runtime.evaluate', {
      expression: 'JSON.stringify({s:window.__recStatus,size:window.__recSize,e:window.__recError||null})',
      returnByValue: true
    });
    st = (r.result && r.result.value) || '';
    if (st.indexOf('"done"') > 0) break;
    if (st.indexOf('"timeout"') > 0) break;
  }
  console.log('STATUS ' + st);
  await sleep(2000);

  // ищем скачанный файл (chrome может добавить (1) и т.п.)
  const files = fs.readdirSync(DL).filter(f => /\.mp4$/.test(f));
  let found = files.filter(f => f === NAME)[0];
  if (!found) {
    const cand = files.filter(f => f.indexOf(path.basename(NAME, '.mp4')) === 0);
    if (cand.length) found = cand[cand.length - 1];
  }
  if (found && found !== NAME) {
    fs.renameSync(path.join(DL, found), path.join(DL, NAME));
    found = NAME;
  }
  if (found) {
    const st2 = fs.statSync(path.join(DL, NAME));
    console.log('VIDEO ' + path.join(DL, NAME) + ' ' + Math.round(st2.size / 1024) + ' KB');
  } else {
    console.log('NOFILE in ' + DL + ' -> ' + files.join(', '));
  }

  await bc.send('Target.closeTarget', { targetId }).catch(() => {});
  c.close();
  bc.close();
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
