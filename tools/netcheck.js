/* Проверка загрузки страницы в уже запущенном браузере: ошибки сети и консоли.
   node tools/netcheck.js "<url>" [ms]
*/
const PORT = Number(process.env.CDP_PORT || 9222);
const URL = process.argv[2];
const WAIT = Number(process.argv[3] || 12000);
const sleep = ms => new Promise(r => setTimeout(r, ms));

class Client {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.handlers = [];
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
      } else if (msg.method) {
        this.handlers.forEach(h => h(msg));
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
  on(fn) { this.handlers.push(fn); }
  close() { try { this.ws.close(); } catch (e) {} }
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
  await c.send('Network.enable');

  c.on(msg => {
    if (msg.method === 'Network.loadingFailed') {
      console.log('FAIL ' + (msg.params.blockedReason || msg.params.errorText) + ' ' + (msg.params.requestId || ''));
    }
    if (msg.method === 'Network.responseReceived') {
      const r = msg.params.response;
      if (r.status >= 400) console.log('HTTP ' + r.status + ' ' + r.url.slice(0, 120));
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const a = (msg.params.args || []).map(x => x.value === undefined ? x.description : x.value).join(' ');
      if (a) console.log('CONSOLE ' + msg.params.type + ': ' + a.slice(0, 200));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.log('EXC ' + (msg.params.exceptionDetails.exception && msg.params.exceptionDetails.exception.description || msg.params.exceptionDetails.text).slice(0, 300));
    }
  });

  await c.send('Page.navigate', { url: URL });
  await sleep(WAIT);
  const r = await c.send('Runtime.evaluate', {
    expression: `(async function(){
      var out={href:location.href, sheets:document.styleSheets.length, css:[], js:[]};
      try{ var res=await fetch('css/style.css'); out.css.push('css/style.css -> '+res.status+' '+(res.headers.get('content-type')||'')); }catch(e){ out.css.push('css fetch err '+e.message); }
      try{ var res2=await fetch('js/game.js'); out.js.push('js/game.js -> '+res2.status); }catch(e){ out.js.push('js err '+e.message); }
      out.links=[].slice.call(document.querySelectorAll('link[rel=stylesheet]')).map(function(l){return l.getAttribute('href');});
      out.scripts=[].slice.call(document.querySelectorAll('script[src]')).map(function(s){return s.getAttribute('src');});
      out.canvas=!!document.getElementById('game');
      return JSON.stringify(out);
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('INFO ' + r.result.value);
  await bc.send('Target.closeTarget', { targetId }).catch(() => {});
  c.close(); bc.close();
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
