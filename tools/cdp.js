/* Управление headless Chrome через CDP: скриншоты и автотесты.
   node tools/cdp.js shot <url> <w> <h> <out.png> [waitMs] [evalScript]
   node tools/cdp.js play <url> [w] [h]  — прогон игры с тапами
*/
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\imput\\Helium\\Application\\chrome.exe';
const PORT = 9333 + Math.floor(Math.random() * 200);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function httpJson(url, opts) {
  const res = await fetch(url, opts);
  return res.json();
}

async function launch() {
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mo-cdp-'));
  const proc = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--hide-scrollbars',
    '--mute-audio',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + userDir,
    'about:blank'
  ], { stdio: 'ignore' });

  let version = null;
  for (let i = 0; i < 60; i++) {
    try {
      version = await httpJson('http://127.0.0.1:' + PORT + '/json/version');
      if (version && version.webSocketDebuggerUrl) break;
    } catch (e) { }
    await sleep(200);
  }
  if (!version) throw new Error('chrome did not start');
  return { proc, version, userDir };
}

class Client {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
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
      } else if (msg.method && this.events.has(msg.method)) {
        this.events.get(msg.method).forEach(fn => fn(msg.params));
      }
    });
  }
  send(method, params) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('timeout: ' + method));
        }
      }, 30000);
    });
  }
  on(method, fn) {
    if (!this.events.has(method)) this.events.set(method, []);
    this.events.get(method).push(fn);
  }
  close() { try { this.ws.close(); } catch (e) { } }
}

async function newPage(port) {
  let t;
  try {
    t = await httpJson('http://127.0.0.1:' + port + '/json/new', { method: 'PUT' });
  } catch (e) {
    t = await httpJson('http://127.0.0.1:' + port + '/json/new');
  }
  return t;
}

async function main() {
  const mode = process.argv[2];
  const url = process.argv[3];
  const isBot = mode === 'bot';
  const w = Number((isBot ? 390 : process.argv[4]) || 390);
  const h = Number((isBot ? 844 : process.argv[5]) || 844);
  const out = isBot ? 'shots/bot.png' : (process.argv[6] || 'shots/shot.png');
  const wait = Number(process.argv[7] || 2500);
  const evalScript = process.argv[8] || '';
  const dsf = Number(process.env.CDP_DSF || 2);
  const mobile = process.env.CDP_MOBILE !== '0';

  const { proc, userDir } = await launch();
  let exitCode = 0;
  try {
    const target = await newPage(PORT);
    const c = new Client(target.webSocketDebuggerUrl);
    await c.ready;
    await c.send('Page.enable');
    await c.send('Runtime.enable');
    await c.send('Emulation.setDeviceMetricsOverride', {
      width: w, height: h, deviceScaleFactor: dsf, mobile: mobile
    });
    await c.send('Page.navigate', { url });
    await sleep(1200);

    if (mode === 'shot') {
      if (evalScript) {
        const r = await c.send('Runtime.evaluate', { expression: evalScript, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) console.error('EVAL ERROR', JSON.stringify(r.exceptionDetails).slice(0, 500));
        if (r.result && r.result.value != null) console.log('EVAL ' + String(r.result.value).slice(0, 2000));
      }
      await sleep(wait);
      const shot = await c.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
      fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
      console.log('saved ' + out);
    } else if (mode === 'bot') {
      const seconds = Number(process.argv[4] || 30);
      const bot = `window.__botOn=true;window.__t0=performance.now();window.__clear=function(lane){var min=9;for(var i=0;i<App.hazards.length;i++){var h=App.hazards[i];if(h.lane!==lane)continue;var lim=(App.catR*5.5+h.size*4.5)/App.orbits[lane];for(var tt=0;tt<2.2;tt+=0.04){var ca=App.cat.ang+App.omega*tt,ha=h.ang+h.spd*tt,da=Math.abs(((ca-ha+Math.PI*3)%(Math.PI*2))-Math.PI);if(da<lim){if(tt<min)min=tt;break;}}}return min;};setInterval(function(){if(!window.__botOn||App.mode!=='playing')return;var cur=App.cat.targetLane,c=window.__clear(cur);if(c<0.42){var best=-1,bt=-1;for(var l=0;l<App.maxLanes;l++){if(l===cur)continue;var t=window.__clear(l);if(t>bt){bt=t;best=l;}}if(best>=0&&bt>c+0.2){for(var k=0;k<4&&App.cat.targetLane!==best;k++)App.switchLane();}}},35);`;
      await c.send('Runtime.evaluate', { expression: bot });
      await c.send('Runtime.evaluate', { expression: 'UI.play()' });
      await sleep(seconds * 1000);
      const st = await c.send('Runtime.evaluate', {
        expression: 'JSON.stringify({mode:App.mode,fps:App.fps,score:Math.floor(App.score),fish:App.fishCount,lanes:App.maxLanes,hazards:App.hazards.length,parts:App.parts.length,survived:App.time,hit:App._lastHit,result:App.result})',
        returnByValue: true
      });
      console.log('BOT ' + st.result.value);
      const shot = await c.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
      fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
      console.log('saved ' + out);
    } else if (mode === 'play') {
      // автотест: старт, серия тапов, сбор состояния
      const tap = async () => {
        await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: Math.round(w / 2), y: Math.round(h / 2), button: 'left', clickCount: 1 });
        await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(w / 2), y: Math.round(h / 2), button: 'left', clickCount: 1 });
      };
      await c.send('Runtime.evaluate', { expression: 'UI.play()' });
      await sleep(600);
      let log = [];
      for (let i = 0; i < 24; i++) {
        await tap();
        await sleep(420);
        const st = await c.send('Runtime.evaluate', {
          expression: 'JSON.stringify({mode:App.mode,score:Math.floor(App.score),fish:App.fishCount,combo:App.combo,hazards:App.hazards.length,fishOn:App.fish.length,lanes:App.maxLanes,mode2:App.mode})',
          returnByValue: true
        });
        log.push(st.result.value);
        if (i === 6 || i === 14) {
          const shot = await c.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
          fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
          const file = out.replace('.png', '-' + i + '.png');
          fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
          console.log('saved ' + file);
        }
      }
      // дождаться смерти и экрана результата
      await sleep(6000);
      const final = await c.send('Runtime.evaluate', {
        expression: 'JSON.stringify({mode:App.mode,score:Math.floor(App.score),best:App.result&&App.result.best,coins:Save.data.coins,overVisible:document.getElementById("scr-over").classList.contains("show"),gained:App.result&&App.result.coins})',
        returnByValue: true
      });
      const shot = await c.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
      console.log('LOG ' + log.slice(0, 8).join(' | '));
      console.log('FINAL ' + final.result.value);
      console.log('saved ' + out);
    }
    c.close();
  } catch (e) {
    console.error('ERR', e.message);
    exitCode = 1;
  } finally {
    try { proc.kill(); } catch (e) { }
    await sleep(300);
    try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) { }
    process.exit(exitCode);
  }
}

main();
