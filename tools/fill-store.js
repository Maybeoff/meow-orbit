/* Заполнение текстов карточки игры в консоли Яндекс Игр через CDP (порт 9222).
   node tools/fill-store.js ru
   node tools/fill-store.js en
   Ставит значения в React-поля (native setter + input/change), затем печатает длины. */
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.CDP_PORT || 9222);
const lang = process.argv[2] || 'ru';
const TEXTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'store-text.json'), 'utf8'));

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

async function evaluate(c, expression) {
  const r = await c.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600));
  return r.result && r.result.value;
}

(async () => {
  const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
  const page = list.filter(t => t.type === 'page')[0];
  const c = new Client(page.webSocketDebuggerUrl);
  await c.ready;
  await c.send('Runtime.enable');

  const t = TEXTS[lang];
  if (!t) throw new Error('no texts for ' + lang);

  // переключаем вкладку языка в блоке "Описание и продвижение"
  const tabName = lang === 'en' ? 'Английский' : 'Русский';
  const clicked = process.env.NOTAB ? 'skipped' : await evaluate(c, `(function(){
    var tabs=[].slice.call(document.querySelectorAll('button,div[role=tab],a'));
    var el=tabs.filter(function(b){return (b.innerText||'').trim().indexOf('${tabName}')===0;})[0];
    if(!el) return 'no tab';
    el.click();
    return 'ok';
  })()`);
  await sleep(700);

  const res = await evaluate(c, `(function(){
    var data=${JSON.stringify(t)};
    function set(sel,val){
      var el=document.querySelector(sel);
      if(!el) return 'missing '+sel;
      var proto=el.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;
      var d=Object.getOwnPropertyDescriptor(proto,'value');
      d.set.call(el,val);
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
      el.dispatchEvent(new Event('blur',{bubbles:true}));
      return sel+'='+(el.value||'').length;
    }
    var out=[];
    out.push(set('input[name=title]',data.title));
    out.push(set('textarea[name=seo-description]',data.seo));
    out.push(set('textarea[name=description]',data.description));
    out.push(set('textarea[name=short-description]',data.short));
    out.push(set('textarea[name=instruction]',data.instruction));
    return out.join(' | ');
  })()`);
  console.log('TAB ' + clicked);
  console.log('SET ' + res);
  c.close();
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
