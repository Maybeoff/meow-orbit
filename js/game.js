/* МЯУ-ОРБИТА — ядро игры (Canvas2D, без зависимостей) */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function angDiff(a, b) {
    var d = (a - b) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  }

  function rgba(hex, a) {
    if (!hex || hex.charAt(0) !== '#') return 'rgba(160,120,255,' + a + ')';
    var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  var SKINS = [
    { id: 'classic', price: 0, body: '#f8f5ff', shade: '#cfc6ee', ear: '#ffb3d1', eye: '#241c3f', accent: '#a98bff', trail: '#a98bff', acc: null },
    { id: 'neon', price: 150, body: '#b6ff6a', shade: '#5dd94f', ear: '#e9ffb0', eye: '#0d2410', accent: '#8dff4d', trail: '#8dff4d', acc: null },
    { id: 'ninja', price: 300, body: '#3a3f5c', shade: '#232739', ear: '#e0e5ff', eye: '#ffe066', accent: '#ff5b7a', trail: '#ff5b7a', acc: 'band' },
    { id: 'robot', price: 450, body: '#bcd8ff', shade: '#6f93c9', ear: '#eaf4ff', eye: '#2b1a4a', accent: '#5cc8ff', trail: '#5cc8ff', acc: 'antenna' },
    { id: 'unicorn', price: 600, body: '#ffe9f6', shade: '#ffb7dd', ear: '#ffd1e8', eye: '#5a2a4a', accent: '#ff8ecd', trail: '#ffb7dd', acc: 'horn' },
    { id: 'void', price: 800, body: '#2a2148', shade: '#151029', ear: '#6b57c9', eye: '#b48bff', accent: '#8b5cff', trail: '#8b5cff', acc: null },
    { id: 'gold', price: 1200, body: '#ffe28a', shade: '#e0a93c', ear: '#fff0c2', eye: '#3a2a00', accent: '#ffd166', trail: '#ffd166', acc: 'star' },
    { id: 'lava', price: 1500, body: '#ff8a5c', shade: '#c93f2a', ear: '#ffc7a8', eye: '#2a0a00', accent: '#ff6b3d', trail: '#ff6b3d', acc: null },
    { id: 'ice', price: 1800, body: '#bff0ff', shade: '#6fc9e8', ear: '#e8fbff', eye: '#123a4a', accent: '#66e0ff', trail: '#66e0ff', acc: null },
    { id: 'cyber', price: 2200, body: '#ff7bd5', shade: '#a02f8b', ear: '#ffd1f2', eye: '#00ffe1', accent: '#ff2ea6', trail: '#ff2ea6', acc: 'band' },
    { id: 'rainbow', price: 3000, body: '#ffffff', shade: '#cccccc', ear: '#ffffff', eye: '#332244', accent: '#ff5fa2', trail: '#ff5fa2', acc: 'rainbow' },
    { id: 'angel', price: 4000, body: '#fff7e8', shade: '#ffd9a8', ear: '#fff1d8', eye: '#4a3a1a', accent: '#ffe6a8', trail: '#ffe6a8', acc: 'halo' }
  ];

  /* ---------- рисование кота (используется и в магазине) ---------- */
  function drawCat(ctx, x, y, r, skin, time, alpha, blink, pop) {
    var t = time || 0;
    var body = skin.body, shade = skin.shade, trail = skin.trail;
    if (skin.id === 'rainbow') {
      var h = (t * 55) % 360;
      body = 'hsl(' + h + ' 92% 76%)';
      shade = 'hsl(' + ((h + 40) % 360) + ' 82% 60%)';
      trail = 'hsl(' + h + ' 92% 66%)';
    }
    alpha = alpha == null ? 1 : alpha;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;

    var wag = Math.sin(t * 7) * r * 0.3;

    // хвост
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.5);
    ctx.quadraticCurveTo(-r * 1.5, r * 0.55 + wag, -r * 1.25, -r * 0.3 + wag * 0.6);
    ctx.strokeStyle = body;
    ctx.lineWidth = r * 0.3;
    ctx.lineCap = 'round';
    ctx.stroke();

    // тело
    ctx.beginPath();
    ctx.ellipse(0, r * 0.6, r * 0.72, r * 0.58, 0, 0, TAU);
    ctx.fillStyle = body;
    ctx.fill();

    // уши
    ctx.fillStyle = body;
    ctx.strokeStyle = shade;
    ctx.lineWidth = Math.max(1, r * 0.06);
    for (var s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.28, -r * 0.78);
      ctx.lineTo(s * r * 0.86, -r * 1.12);
      ctx.lineTo(s * r * 0.8, -r * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * r * 0.42, -r * 0.72);
      ctx.lineTo(s * r * 0.74, -r * 0.92);
      ctx.lineTo(s * r * 0.7, -r * 0.56);
      ctx.closePath();
      ctx.fillStyle = skin.ear;
      ctx.fill();
      ctx.fillStyle = body;
    }

    // голова
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = shade;
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.stroke();

    // блик
    ctx.beginPath();
    ctx.arc(-r * 0.34, -r * 0.36, r * 0.36, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fill();

    // глаза
    var eyeY = -r * 0.04;
    var er = blink ? r * 0.05 : r * 0.17;
    ctx.fillStyle = skin.eye;
    for (var e = -1; e <= 1; e += 2) {
      ctx.beginPath();
      ctx.ellipse(e * r * 0.33, eyeY, r * 0.13, er, 0, 0, TAU);
      ctx.fill();
    }
    if (!blink) {
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (var g = -1; g <= 1; g += 2) {
        ctx.beginPath();
        ctx.arc(g * r * 0.33 + r * 0.05, eyeY - r * 0.07, r * 0.05, 0, TAU);
        ctx.fill();
      }
    }

    // нос
    ctx.beginPath();
    ctx.moveTo(0, r * 0.22);
    ctx.lineTo(-r * 0.09, r * 0.13);
    ctx.lineTo(r * 0.09, r * 0.13);
    ctx.closePath();
    ctx.fillStyle = skin.accent;
    ctx.fill();

    // усики
    ctx.strokeStyle = skin.eye;
    ctx.globalAlpha = alpha * 0.45;
    ctx.lineWidth = Math.max(0.7, r * 0.045);
    for (var w = 0; w < 2; w++) {
      var oy = r * (0.12 + w * 0.14);
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, oy);
      ctx.lineTo(-r * 1.05, oy - r * 0.08);
      ctx.moveTo(-r * 0.5, oy + r * 0.04);
      ctx.lineTo(-r * 1.02, oy + r * 0.12);
      ctx.moveTo(r * 0.5, oy);
      ctx.lineTo(r * 1.05, oy - r * 0.08);
      ctx.moveTo(r * 0.5, oy + r * 0.04);
      ctx.lineTo(r * 1.02, oy + r * 0.12);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha;

    // аксессуары
    if (skin.acc === 'band') {
      ctx.fillStyle = skin.accent;
      ctx.beginPath();
      ctx.rect(-r * 0.98, -r * 0.62, r * 1.96, r * 0.2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.9, -r * 0.55);
      ctx.lineTo(r * 1.5, -r * 0.75);
      ctx.lineTo(r * 1.45, -r * 0.35);
      ctx.closePath();
      ctx.fill();
    } else if (skin.acc === 'horn') {
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.62);
      ctx.lineTo(-r * 0.2, -r * 0.82);
      ctx.lineTo(r * 0.2, -r * 0.82);
      ctx.closePath();
      ctx.fillStyle = '#ffd166';
      ctx.fill();
      ctx.strokeStyle = '#e0a93c';
      ctx.lineWidth = r * 0.05;
      ctx.stroke();
    } else if (skin.acc === 'antenna') {
      ctx.strokeStyle = skin.shade;
      ctx.lineWidth = r * 0.09;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.95);
      ctx.lineTo(0, -r * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -r * 1.55, r * 0.16, 0, TAU);
      ctx.fillStyle = skin.accent;
      ctx.fill();
    } else if (skin.acc === 'halo') {
      ctx.strokeStyle = '#ffe6a8';
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.ellipse(0, -r * 1.32, r * 0.58, r * 0.16, 0, 0, TAU);
      ctx.stroke();
    } else if (skin.acc === 'star') {
      ctx.fillStyle = '#fff6c9';
      for (var i = 0; i < 4; i++) {
        var a = t * 1.6 + i * 1.57;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 1.25, Math.sin(a) * r * 0.85 - r * 0.2, r * 0.07, 0, TAU);
        ctx.fill();
      }
    }

    if (pop && pop > 0) {
      ctx.scale(1 + pop * 0.12, 1 + pop * 0.12);
    }
    ctx.restore();
  }

  var App = {
    cv: null, ctx: null,
    W: 0, H: 0, DPR: 1,
    cx: 0, cy: 0, base: 0,
    orbits: [0, 0, 0], planetR: 40, catR: 14,
    mode: 'boot',
    t: 0,
    ui: {},
    skin: SKINS[0],
    SKINS: SKINS,

    cat: { ang: -Math.PI / 2, r: 0, lane: 0, targetLane: 0, pop: 0, blink: 0 },
    omega: 1.65, time: 0, timeScale: 1, slowT: 0, magnetT: 0,
    hazards: [], fish: [], powers: [], parts: [], texts: [], rings: [], trail: [],
    score: 0, combo: 0, comboT: 0, fishCount: 0,
    shield: false, invuln: 0, shake: 0, flash: 0, hitstop: 0,
    spawnH: 0, spawnF: 0, spawnP: 0,
    maxLanes: 2, thirdOpen: false,
    deathT: 0, reviveUsed: false, committed: 0,
    tutorial: false, tutT: 0,
    stars: [], bgCv: null, planetCv: null,
    glowCache: {},
    ambient: [],
    result: null,
    bestShown: 0,

    /* ---------- init ---------- */
    init: function () {
      this.cv = document.getElementById('game');
      this.ctx = this.cv.getContext('2d', { alpha: false });
      this.god = /[?&]nohit=1/.test(location.search);
      this.noGlow = /[?&]noglow=1/.test(location.search);
      this.skin = this.skinById((global.Save && Save.data && Save.data.skin) || 'classic');
      var self = this;
      window.addEventListener('resize', function () { self.resize(); });
      window.addEventListener('orientationchange', function () { setTimeout(function () { self.resize(); }, 120); });
      this.resize();
      this.bindInput();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    },

    bindInput: function () {
      var self = this;
      var blocked = function (el) {
        if (!el || !el.closest) return false;
        return !!(el.closest('button') || el.closest('a') || el.closest('.screen.show') || el.closest('.card') || el.closest('.toast'));
      };
      document.addEventListener('pointerdown', function (e) {
        if (blocked(e.target)) return;
        if (global.Sound) Sound.unlock();
        if (self.mode === 'playing') {
          e.preventDefault();
          self.switchLane();
        }
      }, { passive: false });

      document.addEventListener('keydown', function (e) {
        if (e.repeat) return;
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
          e.preventDefault();
          if (global.Sound) Sound.unlock();
          if (self.mode === 'playing') self.switchLane();
        } else if (e.code === 'Escape' || e.code === 'KeyP') {
          if (self.mode === 'playing' && self.ui.onAutoPause) self.ui.onAutoPause();
        }
      });

      document.addEventListener('visibilitychange', function () {
        if (document.hidden && self.mode === 'playing' && self.ui.onAutoPause) self.ui.onAutoPause();
      });
      window.addEventListener('blur', function () {
        if (self.mode === 'playing' && self.ui.onAutoPause) self.ui.onAutoPause();
      });
    },

    resize: function () {
      this.W = window.innerWidth;
      this.H = window.innerHeight;
      this.DPR = clamp(window.devicePixelRatio || 1, 1, 2);
      this.cv.width = Math.round(this.W * this.DPR);
      this.cv.height = Math.round(this.H * this.DPR);
      this.cv.style.width = this.W + 'px';
      this.cv.style.height = this.H + 'px';
      this.layout();
      this.buildStars();
      this.buildBg();
      this.buildPlanet();
    },

    layout: function () {
      this.cx = this.W / 2;
      this.cy = this.H / 2;
      // арена должна целиком влезать по ширине: крайняя орбита + габарит объекта
      this.base = Math.min(this.W * 0.54, this.H * 0.42, (this.W / 2 - 30) / 0.98);
      var b = this.base;
      this.orbits = [b * 0.60, b * 0.79, b * 0.98];
      this.planetR = Math.max(24, this.orbits[0] * 0.38);
      this.catR = clamp(b * 0.078, 9.5, 30);
      if (this.cat.r === 0) this.cat.r = this.orbits[0];
      this.cat.r = clamp(this.cat.r, this.orbits[0], this.orbits[2]);
    },

    /* ---------- кэш фона и планеты ---------- */
    buildStars: function () {
      this.stars = [];
      var n = Math.round(clamp((this.W * this.H) / 9000, 60, 170));
      for (var i = 0; i < n; i++) {
        this.stars.push({
          x: Math.random(),
          y: Math.random(),
          s: rand(0.5, 2.2),
          ph: rand(0, TAU),
          sp: rand(0.4, 1.6)
        });
      }
      this.ambient = [];
      for (var j = 0; j < 6; j++) {
        this.ambient.push({
          ang: rand(0, TAU),
          spd: rand(0.08, 0.24) * (Math.random() < 0.5 ? -1 : 1),
          r: this.orbits[1] * rand(0.85, 1.35),
          size: rand(7, 12),
          ph: rand(0, TAU)
        });
      }
    },

    buildBg: function () {
      var cv = document.createElement('canvas');
      cv.width = Math.round(this.W * this.DPR);
      cv.height = Math.round(this.H * this.DPR);
      var c = cv.getContext('2d');
      c.scale(this.DPR, this.DPR);
      var g = c.createLinearGradient(0, 0, this.W * 0.4, this.H);
      g.addColorStop(0, '#0b0720');
      g.addColorStop(0.45, '#0a0618');
      g.addColorStop(1, '#12082a');
      c.fillStyle = g;
      c.fillRect(0, 0, this.W, this.H);

      var blobs = [
        { x: this.W * 0.18, y: this.H * 0.22, r: Math.max(this.W, this.H) * 0.55, col: 'rgba(94,45,180,.20)' },
        { x: this.W * 0.86, y: this.H * 0.72, r: Math.max(this.W, this.H) * 0.5, col: 'rgba(255,60,140,.10)' },
        { x: this.W * 0.55, y: this.H * 0.05, r: Math.max(this.W, this.H) * 0.36, col: 'rgba(50,120,255,.12)' }
      ];
      blobs.forEach(function (b) {
        var rg = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        rg.addColorStop(0, b.col);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = rg;
        c.fillRect(0, 0, cv.width, cv.height);
      });
      this.bgCv = cv;
    },

    buildPlanet: function () {
      var R = this.planetR;
      var pad = R * 0.75;
      var size = Math.ceil((R + pad) * 2);
      var cv = document.createElement('canvas');
      cv.width = size * this.DPR;
      cv.height = size * this.DPR;
      var c = cv.getContext('2d');
      c.scale(this.DPR, this.DPR);
      var m = size / 2;
      var g = c.createRadialGradient(m - R * 0.33, m - R * 0.35, R * 0.12, m, m, R);
      g.addColorStop(0, '#8f74ff');
      g.addColorStop(0.45, '#4d34a8');
      g.addColorStop(0.8, '#281a5e');
      g.addColorStop(1, '#170d3a');
      c.beginPath();
      c.arc(m, m, R, 0, TAU);
      c.fillStyle = g;
      c.fill();

      // кратеры / пятна
      c.save();
      c.beginPath();
      c.arc(m, m, R, 0, TAU);
      c.clip();
      var spots = [
        { x: -0.35, y: -0.3, r: 0.26, a: 0.20 },
        { x: 0.4, y: 0.15, r: 0.34, a: 0.16 },
        { x: -0.15, y: 0.55, r: 0.22, a: 0.22 },
        { x: 0.55, y: -0.42, r: 0.16, a: 0.25 }
      ];
      spots.forEach(function (s) {
        c.beginPath();
        c.arc(m + s.x * R, m + s.y * R, s.r * R, 0, TAU);
        c.fillStyle = 'rgba(255,255,255,' + s.a * 0.5 + ')';
        c.fill();
        c.beginPath();
        c.arc(m + s.x * R, m + s.y * R + R * 0.05, s.r * R * 0.9, 0, TAU);
        c.fillStyle = 'rgba(20,8,50,' + s.a + ')';
        c.fill();
      });
      // атмосферный блик
      var rim = c.createRadialGradient(m, m, R * 0.72, m, m, R * 1.02);
      rim.addColorStop(0, 'rgba(140,110,255,0)');
      rim.addColorStop(1, 'rgba(150,120,255,.35)');
      c.fillStyle = rim;
      c.beginPath();
      c.arc(m, m, R, 0, TAU);
      c.fill();
      c.restore();

      c.strokeStyle = 'rgba(190,170,255,.55)';
      c.lineWidth = Math.max(1, R * 0.045);
      c.beginPath();
      c.arc(m, m, R - R * 0.02, 0, TAU);
      c.stroke();

      this.planetCv = cv;
      this.planetSize = size;
    },

    /* ---------- прогон ---------- */
    skinById: function (id) {
      for (var i = 0; i < SKINS.length; i++) if (SKINS[i].id === id) return SKINS[i];
      return SKINS[0];
    },

    setSkin: function (id) {
      this.skin = this.skinById(id);
    },

    toMenu: function () {
      this.mode = 'menu';
      this.cat.r = this.orbits[0];
      this.cat.targetLane = 0;
      this.cat.lane = 0;
      this.hazards.length = 0;
      this.fish.length = 0;
      this.powers.length = 0;
      this.trail.length = 0;
      this.texts.length = 0;
    },

    startRun: function () {
      this.resetRun();
      this.mode = 'playing';
      if (global.Save) Save.countRun();
      if (global.SDK) SDK.gameplayStart();
    },

    resetRun: function () {
      this.time = 0;
      this.omega = 1.62;
      this.timeScale = 1;
      this.slowT = 0;
      this.magnetT = 0;
      this.score = 0;
      this.combo = 0;
      this.comboT = 0;
      this.fishCount = 0;
      this.shield = false;
      this.invuln = 0;
      this.shake = 0;
      this.flash = 0;
      this.hitstop = 0;
      this.hazards.length = 0;
      this.fish.length = 0;
      this.powers.length = 0;
      this.parts.length = 0;
      this.texts.length = 0;
      this.rings.length = 0;
      this.trail.length = 0;
      this.cat.ang = -Math.PI / 2;
      this.cat.lane = 0;
      this.cat.targetLane = 0;
      this.cat.r = this.orbits[0];
      this.cat.pop = 0;
      this.cat.blink = 0;
      this.maxLanes = 2;
      this.thirdOpen = false;
      this.laneDir = 1;
      this.spawnH = 1.5;
      this.spawnF = 0.7;
      this.spawnP = 9;
      this.deathT = 0;
      this.reviveUsed = false;
      this.committed = 0;
      this.corridorT = 0;
      this.result = null;
      this.tutorial = !(global.Save && Save.data.tut);
      this.tutT = 0;
    },

    switchLane: function () {
      if (this.mode !== 'playing') return;
      var max = this.maxLanes;
      var cur = this.cat.targetLane;
      var dir = this.laneDir || 1;
      var next = cur + dir;
      if (next > max - 1) { dir = -1; next = max - 2; }
      else if (next < 0) { dir = 1; next = 1; }
      if (next < 0) next = 0;
      if (next > max - 1) next = max - 1;
      this.laneDir = dir;
      this.cat.lane = next;
      this.cat.targetLane = next;
      this.cat.pop = 1;
      if (this.tutorial) {
        this.tutorial = false;
        if (global.Save) { Save.data.tut = true; Save.save(); }
      }
      if (global.Sound) Sound.switchLane();
      var x = this.catX(), y = this.catY();
      for (var i = 0; i < 5; i++) {
        this.parts.push({
          x: x, y: y, vx: rand(-40, 40), vy: rand(-40, 40),
          life: 0.3, max: 0.3, size: rand(1, 2.6), col: this.skin.trail, kind: 'spark'
        });
      }
    },

    pause: function () {
      if (this.mode !== 'playing') return;
      this.mode = 'paused';
      if (global.SDK) SDK.gameplayStop();
    },

    resume: function () {
      if (this.mode !== 'paused') return;
      this.mode = 'playing';
      if (global.SDK) SDK.gameplayStart();
    },

    revive: function () {
      if (this.mode !== 'dead' && this.mode !== 'dying') return false;
      this.reviveUsed = true;
      this.mode = 'playing';
      this.deathT = 0;
      this.invuln = 2.4;
      this.shake = 0;
      // расчищаем коридор
      var ang = this.cat.ang;
      for (var i = this.hazards.length - 1; i >= 0; i--) {
        var h = this.hazards[i];
        if (Math.abs(angDiff(h.ang, ang)) < 1.5) {
          this.explodeHazard(h);
          this.hazards.splice(i, 1);
        }
      }
      this.rings.push({ x: this.catX(), y: this.catY(), r: this.catR, r2: this.catR * 9, life: 0.7, max: 0.7, col: '#ffd166', w: 4 });
      this.flash = 0.5;
      if (global.SDK) SDK.gameplayStart();
      if (global.Sound) Sound.power();
      return true;
    },

    die: function () {
      if (this.mode !== 'playing') return;
      this.mode = 'dying';
      this.deathT = 0.6;
      this.hitstop = 0.1;
      this.shake = 22;
      this.flash = 0.65;
      if (global.Sound) Sound.hit();
      if (global.SDK) SDK.gameplayStop();
      var x = this.catX(), y = this.catY();
      this.rings.push({ x: x, y: y, r: this.catR, r2: this.catR * 12, life: 0.75, max: 0.75, col: '#ff5c7a', w: 5 });
      for (var i = 0; i < 26; i++) {
        var a = rand(0, TAU), sp = rand(40, 240);
        this.parts.push({
          x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: rand(0.4, 1), max: 1, size: rand(1.5, 4), col: i % 3 === 0 ? '#ffd166' : this.skin.trail, kind: 'spark'
        });
      }
    },

    coinValue: function () {
      return Math.floor(this.score / 50) + this.fishCount * 2;
    },

    finishRun: function () {
      this.mode = 'dead';
      var total = this.coinValue();
      var gain = Math.max(0, total - this.committed);
      if (gain > 0) {
        this.committed = total;
        Save.addCoins(gain);
      }
      var isNew = this.score > (Save.data.best || 0);
      Save.addBest(this.score);
      if (isNew && this.score > 0) {
        if (global.SDK) SDK.setScore(this.score);
        if (global.Sound) Sound.best();
        if (global.SDK) SDK.requestReview();
      }
      this.result = {
        score: Math.floor(this.score),
        best: Save.data.best,
        fish: this.fishCount,
        coins: total,
        gain: gain,
        isNew: isNew,
        doubled: false
      };
      if (this.ui.onGameOver) this.ui.onGameOver(this.result, { canRevive: !this.reviveUsed });
    },

    /* ---------- апдейт ---------- */
    loop: function (ts) {
      if (!this._last) this._last = ts;
      var dt = Math.min(0.05, (ts - this._last) / 1000);
      this._last = ts;
      this._fc = (this._fc || 0) + 1;
      if (!this._fstart) { this._fstart = ts; this._fc = 1; }
      if (ts - this._fstart >= 1000) {
        this.fps = Math.round((this._fc * 1000) / (ts - this._fstart));
        this._fc = 0;
        this._fstart = ts;
      }
      this.update(dt);
      this.draw();
      requestAnimationFrame(this.loop);
    },

    update: function (dt) {
      this.t += dt;
      this.shake = Math.max(0, this.shake - dt * 55);
      this.flash = Math.max(0, this.flash - dt * 2.2);
      this.updateParticles(dt);

      if (this.mode === 'playing') {
        this.updatePlaying(dt);
      } else if (this.mode === 'dying') {
        this.deathT -= dt;
        this.updateObjects(dt * 0.35, dt);
        if (this.deathT <= 0) this.finishRun();
      } else if (this.mode === 'menu' || this.mode === 'boot') {
        this.updateAmbient(dt);
      } else if (this.mode === 'dead') {
        this.updateObjects(dt * 0.25, dt);
      }
    },

    updateAmbient: function (dt) {
      this.cat.ang = (this.cat.ang + dt * 0.55) % TAU;
      this.cat.blink -= dt;
      if (this.cat.blink < -3) this.cat.blink = 0.12;
      for (var i = 0; i < this.ambient.length; i++) {
        var a = this.ambient[i];
        a.ang += a.spd * dt;
      }
      if (this.mode !== 'dead') {
        this.cat.r += (this.orbits[0] - this.cat.r) * Math.min(1, dt * 3);
      }
    },

    updatePlaying: function (dt) {
      var gdt = dt * this.timeScale;

      this.time += dt;
      var targetTS = this.slowT > 0 ? 0.55 : 1;
      this.timeScale += (targetTS - this.timeScale) * Math.min(1, dt * 6);
      if (this.slowT > 0) this.slowT -= dt;
      if (this.magnetT > 0) this.magnetT -= dt;

      this.omega = 1.45 + Math.min(1.25, this.time * 0.022);
      this.cat.ang = (this.cat.ang + this.omega * gdt) % TAU;

      var targetR = this.orbits[this.cat.targetLane];
      this.cat.r += (targetR - this.cat.r) * Math.min(1, dt * 15);
      this.cat.pop = Math.max(0, this.cat.pop - dt * 4.5);
      this.cat.blink -= dt;
      if (this.cat.blink < -3.2) this.cat.blink = 0.1;

      this.score += dt * 40 * (this.omega / 1.62);

      if (!this.thirdOpen && this.score >= 1000) this.openThirdLane();

      if (this.comboT > 0) {
        this.comboT -= dt;
        if (this.comboT <= 0) this.combo = 0;
      }

      this.updateTrail(dt);
      this.spawnStuff(gdt);
      this.updateObjects(gdt, dt);
      this.ensureCorridor(dt);
      this.collide();

      if (this.invuln > 0) this.invuln -= dt;
      if (this.tutorial) {
        this.tutT += dt;
        if (this.tutT > 6) this.tutorial = false;
      }

      if (this.ui.onHud) this.ui.onHud(this);
    },

    openThirdLane: function () {
      this.thirdOpen = true;
      this.maxLanes = 3;
      this.flash = 0.32;
      this.shake = 8;
      this.rings.push({
        x: this.cx, y: this.cy, r: this.orbits[2] * 0.1, r2: this.orbits[2] * 1.12,
        life: 0.8, max: 0.8, col: '#8b5cff', w: 3
      });
      this.texts.push({
        x: this.cx, y: this.cy - this.orbits[2] * 0.5, vy: -18, life: 1.8, max: 1.8,
        text: (global.t ? t('event.third') : '3-я ОРБИТА'), col: '#c9b6ff', size: 15
      });
      if (global.Sound) Sound.power();
    },

    updateTrail: function (dt) {
      this.trail.push({ x: this.catX(), y: this.catY() });
      var maxLen = this.catR * 7.5, total = 0;
      for (var i = this.trail.length - 1; i > 0; i--) {
        var dx = this.trail[i].x - this.trail[i - 1].x;
        var dy = this.trail[i].y - this.trail[i - 1].y;
        total += Math.sqrt(dx * dx + dy * dy);
        if (total > maxLen) { this.trail.splice(0, i - 1); break; }
      }
      if (this.trail.length > 60) this.trail.splice(0, this.trail.length - 60);
      if (this.trail.length > 3 && Math.random() < 0.55) {
        var last = this.trail[this.trail.length - 1];
        this.parts.push({
          x: last.x + rand(-3, 3), y: last.y + rand(-3, 3),
          vx: rand(-12, 12), vy: rand(-12, 12),
          life: rand(0.2, 0.5), max: 0.5, size: rand(1, 2.4), col: this.skin.trail, kind: 'spark'
        });
      }
    },

    catX: function () { return this.cx + Math.cos(this.cat.ang) * this.cat.r; },
    catY: function () { return this.cy + Math.sin(this.cat.ang) * this.cat.r; },

    lanes: function () {
      var out = [];
      for (var i = 0; i < this.maxLanes; i++) out.push(i);
      return out;
    },

    spotFree: function (lane, ang, gap) {
      for (var i = 0; i < this.hazards.length; i++) {
        var h = this.hazards[i];
        if (h.lane === lane && Math.abs(angDiff(h.ang, ang)) < gap) return false;
      }
      return true;
    },

    laneBlocked: function (lane, ang, gap) {
      for (var i = 0; i < this.hazards.length; i++) {
        var h = this.hazards[i];
        if (h.lane === lane && Math.abs(angDiff(h.ang, ang)) < gap) return true;
      }
      return false;
    },

    anyLaneFree: function (ang, gap) {
      for (var l = 0; l < this.maxLanes; l++) {
        if (!this.laneBlocked(l, ang, gap)) return true;
      }
      return false;
    },

    // расстояние по дуге (в пикселях) между двумя углами на орбите
    arcDist: function (lane, a, b) {
      return Math.abs(angDiff(a, b)) * this.orbits[lane];
    },

    // астероид, реально перекрывающий дорожку в этой точке
    hazardBlocks: function (lane, ang, skip) {
      for (var i = 0; i < this.hazards.length; i++) {
        var h = this.hazards[i];
        if (h === skip || h.lane !== lane) continue;
        if (this.arcDist(lane, h.ang, ang) < this.catR * 1.15 + h.size * 0.95) return h;
      }
      return null;
    },

    // есть ли хоть одна свободная дорожка в этой точке орбиты
    escapeFree: function (ang) {
      for (var l = 0; l < this.maxLanes; l++) {
        if (!this.hazardBlocks(l, ang)) return l;
      }
      return -1;
    },

    /* Страховка от «глухих» стен: если впереди все дорожки перекрыты —
       убираем один астероид, чтобы всегда оставался проходимый коридор. */
    ensureCorridor: function (dt) {
      this.corridorT = (this.corridorT || 0) - dt;
      if (this.corridorT > 0) return;
      this.corridorT = 0.1;
      var steps = 20, span = 3.4;
      for (var s = 0; s <= steps; s++) {
        var ang = this.cat.ang + (s / steps) * span;
        if (this.escapeFree(ang) < 0) this.breakWall(ang);
      }
    },

    breakWall: function (ang) {
      var cand = [];
      for (var i = 0; i < this.hazards.length; i++) {
        var h = this.hazards[i];
        var d = this.arcDist(h.lane, h.ang, ang);
        if (d < this.catR * 2.2 + h.size * 1.8) cand.push({ h: h, d: d });
      }
      if (!cand.length) return;
      cand.sort(function (a, b) { return a.d - b.d; });
      for (var k = 0; k < cand.length; k++) {
        var hh = cand[k].h;
        for (var l = 0; l < this.maxLanes; l++) {
          if (!this.hazardBlocks(l, ang, hh)) {
            this.removeHazard(hh);
            return;
          }
        }
      }
      this.removeHazard(cand[0].h);
    },

    removeHazard: function (h) {
      var idx = this.hazards.indexOf(h);
      if (idx < 0) return;
      this.explodeHazard(h);
      this.hazards.splice(idx, 1);
    },

    spawnStuff: function (gdt) {
      // астероиды
      this.spawnH -= gdt;
      if (this.spawnH <= 0) {
        this.spawnH = Math.max(0.5, 1.1 - this.time * 0.011) * rand(0.85, 1.2);
        if (this.hazards.length < 18) this.trySpawnHazard();
      }
      // рыбки
      this.spawnF -= gdt;
      if (this.spawnF <= 0) {
        this.spawnF = Math.max(0.34, 0.78 - this.time * 0.006) * rand(0.8, 1.25);
        if (this.fish.length < 10) this.trySpawnFish();
      }
      // бонусы
      this.spawnP -= gdt;
      if (this.spawnP <= 0) {
        this.spawnP = rand(11, 16);
        if (this.powers.length < 2) this.trySpawnPower();
      }
    },

    trySpawnHazard: function () {
      for (var attempt = 0; attempt < 14; attempt++) {
        var lane = pick(this.lanes());
        var ang = (this.cat.ang + rand(2.6, 5.6)) % TAU;
        if (!this.spotFree(lane, ang, 0.42)) continue;
        // коридор должен оставаться свободным и рядом с точкой спавна
        var wall = false;
        for (var q = -2; q <= 2; q++) {
          if (this.escapeFree(ang + q * 0.14) < 0) { wall = true; break; }
        }
        if (wall) continue;
        // не спавним слишком близко к рыбе на этой же дорожке
        var bad = false;
        for (var i = 0; i < this.fish.length; i++) {
          var f = this.fish[i];
          if (f.lane === lane && Math.abs(angDiff(f.ang, ang)) < 0.2) { bad = true; break; }
        }
        if (bad) continue;

        var size = clamp(this.catR * rand(0.95, 1.25), 10, 30);
        // астероиды не должны накладываться друг на друга на одной орбите
        var stacked = false;
        for (var j = 0; j < this.hazards.length; j++) {
          var hz = this.hazards[j];
          if (hz.lane !== lane) continue;
          if (this.arcDist(lane, hz.ang, ang) < (size + hz.size) * 1.55) { stacked = true; break; }
        }
        if (stacked) continue;
        this.hazards.push({
          ang: ang,
          lane: lane,
          r: this.orbits[lane],
          spd: Math.random() < 0.74 ? 0 : (Math.random() < 0.5 ? -1 : 1) * rand(0.08, 0.3),
          size: size,
          rot: rand(0, TAU),
          rotSpd: rand(-2.4, 2.4),
          life: rand(5.5, 8),
          fade: 0,
          near: false,
          poly: this.makePoly(size)
        });
        // рыбок, оказавшихся вплотную к новому астероиду, убираем
        for (var fi = this.fish.length - 1; fi >= 0; fi--) {
          var ff = this.fish[fi];
          if (ff.lane !== lane) continue;
          if (this.arcDist(lane, ff.ang, ang) < (size + ff.size) * 1.9) this.fish.splice(fi, 1);
        }
        return;
      }
    },

    makePoly: function (size) {
      var pts = [], n = 7;
      for (var i = 0; i < n; i++) {
        var a = (i / n) * TAU;
        var rr = size * rand(0.78, 1.15);
        pts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr });
      }
      return pts;
    },

    trySpawnFish: function () {
      for (var attempt = 0; attempt < 10; attempt++) {
        var lane = pick(this.lanes());
        var ang = (this.cat.ang + rand(0.85, 4.6)) % TAU;
        if (this.laneBlocked(lane, ang, 0.3)) continue;
        var fsize = clamp(this.catR * 0.82, 7, 20);
        // не ставим рыбку вплотную к астероиду — чтобы не выглядело приманкой-ловушкой
        var tooClose = false;
        for (var hh = 0; hh < this.hazards.length; hh++) {
          var hz = this.hazards[hh];
          if (hz.lane !== lane) continue;
          if (this.arcDist(lane, hz.ang, ang) < (hz.size + fsize) * 1.9) { tooClose = true; break; }
        }
        if (tooClose) continue;
        var dup = false;
        for (var i = 0; i < this.fish.length; i++) {
          var f = this.fish[i];
          if (f.lane === lane && Math.abs(angDiff(f.ang, ang)) < 0.34) { dup = true; break; }
        }
        if (dup) continue;

        var stream = Math.random() < 0.3 ? 3 : 1;
        for (var k = 0; k < stream; k++) {
          var a2 = ang + k * 0.44;
          if (this.laneBlocked(lane, a2, 0.22)) break;
          this.fish.push({
            ang: a2, lane: lane, r: this.orbits[lane],
            size: fsize,
            ph: rand(0, TAU), life: rand(10, 15), fade: 1
          });
        }
        return;
      }
    },

    trySpawnPower: function () {
      for (var attempt = 0; attempt < 8; attempt++) {
        var lane = pick(this.lanes());
        var ang = (this.cat.ang + rand(1.2, 4.4)) % TAU;
        if (!this.spotFree(lane, ang, 0.36)) continue;
        var type = pick(['shield', 'magnet', 'slow']);
        this.powers.push({
          ang: ang, lane: lane, r: this.orbits[lane], type: type,
          size: clamp(this.catR * 0.95, 9, 22), ph: rand(0, TAU), life: 16, fade: 1
        });
        return;
      }
    },

    updateObjects: function (gdt, dt) {
      var i, o;
      // астероиды
      for (i = this.hazards.length - 1; i >= 0; i--) {
        o = this.hazards[i];
        o.ang = (o.ang + o.spd * gdt) % TAU;
        // дрейфующий астероид останавливается, чтобы не наползти на соседний
        if (o.spd) {
          for (var j = 0; j < this.hazards.length; j++) {
            var o2 = this.hazards[j];
            if (o2 === o || o2.lane !== o.lane) continue;
            if (this.arcDist(o.lane, o2.ang, o.ang) < (o.size + o2.size) * 1.45) { o.spd = 0; break; }
          }
        }
        o.rot += o.rotSpd * dt;
        o.life -= gdt;
        if (o.life <= 0) o.fade -= dt * 1.8;
        else if (o.fade < 1) o.fade = Math.min(1, o.fade + dt * 2.6);
        if (o.fade <= 0) this.hazards.splice(i, 1);
      }
      // рыбки
      for (i = this.fish.length - 1; i >= 0; i--) {
        o = this.fish[i];
        o.ang = (o.ang + 0.0) % TAU;
        o.life -= gdt;
        if (o.life <= 0) o.fade -= dt * 2;
        else if (o.fade < 1) o.fade = Math.min(1, o.fade + dt * 3);
        if (o.fade <= 0) this.fish.splice(i, 1);
      }
      // бонусы
      for (i = this.powers.length - 1; i >= 0; i--) {
        o = this.powers[i];
        o.life -= gdt;
        if (o.life <= 0) o.fade -= dt * 2;
        if (o.fade <= 0) this.powers.splice(i, 1);
      }
    },

    collide: function () {
      var catX = this.catX(), catY = this.catY();
      var i, o, dx, dy, dist2, rr, hx, hy;

      // астероиды
      for (i = this.hazards.length - 1; i >= 0; i--) {
        o = this.hazards[i];
        if (o.fade < 0.82) continue;
        hx = this.cx + Math.cos(o.ang) * o.r;
        hy = this.cy + Math.sin(o.ang) * o.r;
        dx = catX - hx; dy = catY - hy;
        dist2 = dx * dx + dy * dy;
        rr = this.catR * 0.62 + o.size * 0.74;
        if (dist2 < rr * rr) {
          this.hazards.splice(i, 1);
          if (!this.god) this.hit(o);
          continue;
        }
        if (!o.near && dist2 < rr * rr * 3.2) {
          o.near = true;
          this.score += 6;
          for (var k = 0; k < 3; k++) {
            this.parts.push({
              x: catX, y: catY, vx: rand(-30, 30), vy: rand(-30, 30),
              life: 0.28, max: 0.28, size: rand(1, 2), col: '#fff', kind: 'spark'
            });
          }
        }
      }

      // рыбки
      for (i = this.fish.length - 1; i >= 0; i--) {
        o = this.fish[i];
        if (o.fade < 0.5) continue;
        hx = this.cx + Math.cos(o.ang) * o.r;
        hy = this.cy + Math.sin(o.ang) * o.r;
        dx = catX - hx; dy = catY - hy;
        rr = this.catR * 0.9 + o.size * 0.95;
        if (dx * dx + dy * dy < rr * rr) {
          this.fish.splice(i, 1);
          this.collectFish(o);
        }
      }

      // бонусы
      for (i = this.powers.length - 1; i >= 0; i--) {
        o = this.powers[i];
        hx = this.cx + Math.cos(o.ang) * o.r;
        hy = this.cy + Math.sin(o.ang) * o.r;
        dx = catX - hx; dy = catY - hy;
        rr = this.catR + o.size;
        if (dx * dx + dy * dy < rr * rr) {
          this.powers.splice(i, 1);
          this.takePower(o);
        }
      }
    },

    collectFish: function (f) {
      var mult = 1 + Math.min(7, Math.floor(this.combo / 4));
      this.combo += 1;
      this.comboT = 3.1;
      var add = 25 * mult;
      this.score += add;
      this.fishCount += 1;
      Save.addFish(1);

      var x = this.cx + Math.cos(f.ang) * f.r;
      var y = this.cy + Math.sin(f.ang) * f.r;
      this.texts.push({
        x: x, y: y - 8, vy: -34, life: 0.75, max: 0.75,
        text: '+' + add, col: mult > 1 ? '#ffd166' : '#fff2c9', size: mult > 1 ? 15 : 12
      });
      this.rings.push({ x: x, y: y, r: f.size * 0.6, r2: f.size * 2.6, life: 0.35, max: 0.35, col: '#ffd166', w: 2 });
      for (var i = 0; i < 6; i++) {
        var a = rand(0, TAU), sp = rand(20, 90);
        this.parts.push({
          x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: rand(0.25, 0.55), max: 0.55, size: rand(1, 2.6), col: i % 2 ? '#ffd166' : '#fff', kind: 'spark'
        });
      }
      if (global.Sound) Sound.pickup(this.combo);
      if (this.ui.onCombo) this.ui.onCombo(this.combo);
    },

    takePower: function (p) {
      var x = this.cx + Math.cos(p.ang) * p.r;
      var y = this.cy + Math.sin(p.ang) * p.r;
      var label = '';
      if (p.type === 'shield') {
        this.shield = true;
        label = global.t ? t('power.shield') : 'ЩИТ';
        if (this.ui.onPower) this.ui.onPower('shield');
      } else if (p.type === 'magnet') {
        this.magnetT = 7;
        label = global.t ? t('power.magnet') : 'МАГНИТ';
        if (this.ui.onPower) this.ui.onPower('magnet');
      } else {
        this.slowT = 5;
        label = global.t ? t('power.slow') : 'ЗАМЕДЛЕНИЕ';
        if (this.ui.onPower) this.ui.onPower('slow');
      }
      this.texts.push({ x: x, y: y - 10, vy: -30, life: 1.1, max: 1.1, text: label, col: '#a7f3cd', size: 13 });
      this.rings.push({ x: x, y: y, r: p.size * 0.5, r2: p.size * 4, life: 0.5, max: 0.5, col: '#67e8a5', w: 2.5 });
      if (global.Sound) Sound.power();
    },

    hit: function (h) {
      var x = this.cx + Math.cos(h.ang) * h.r;
      var y = this.cy + Math.sin(h.ang) * h.r;
      this._lastHit = {
        t: +this.time.toFixed(2),
        catLane: this.cat.targetLane,
        catR: Math.round(this.cat.r),
        hLane: h.lane,
        hFade: +h.fade.toFixed(2),
        hAng: +h.ang.toFixed(2),
        catAng: +this.cat.ang.toFixed(2),
        invuln: this.invuln > 0,
        shield: this.shield
      };
      if (this.invuln > 0) {
        this.burstRock(x, y, h.size);
        return;
      }
      if (this.shield) {
        this.shield = false;
        this.invuln = 1.5;
        this.shake = 14;
        this.flash = 0.25;
        this.burstRock(x, y, h.size);
        this.rings.push({ x: this.catX(), y: this.catY(), r: this.catR, r2: this.catR * 6, life: 0.5, max: 0.5, col: '#5cc8ff', w: 3 });
        if (global.Sound) Sound.shield();
        if (this.ui.onPower) this.ui.onPower('shield-broken');
        return;
      }
      this.burstRock(x, y, h.size);
      this.die();
    },

    burstRock: function (x, y, size) {
      for (var i = 0; i < 12; i++) {
        var a = rand(0, TAU), sp = rand(30, 170);
        this.parts.push({
          x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: rand(0.3, 0.7), max: 0.7, size: rand(1.5, 3.6), col: i % 3 ? '#ff8a5c' : '#ffd166', kind: 'spark'
        });
      }
      this.rings.push({ x: x, y: y, r: size * 0.4, r2: size * 3.4, life: 0.4, max: 0.4, col: '#ff6b6b', w: 2.5 });
    },

    explodeHazard: function (h) {
      this.burstRock(this.cx + Math.cos(h.ang) * h.r, this.cy + Math.sin(h.ang) * h.r, h.size);
    },

    updateParticles: function (dt) {
      var i;
      for (i = this.parts.length - 1; i >= 0; i--) {
        var p = this.parts[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= (1 - dt * 2.4);
        p.vy *= (1 - dt * 2.4);
        p.life -= dt;
        if (p.life <= 0) this.parts.splice(i, 1);
      }
      if (this.parts.length > 420) this.parts.splice(0, this.parts.length - 420);
      for (i = this.rings.length - 1; i >= 0; i--) {
        var r = this.rings[i];
        r.life -= dt;
        if (r.life <= 0) this.rings.splice(i, 1);
      }
      for (i = this.texts.length - 1; i >= 0; i--) {
        var tx = this.texts[i];
        tx.y += tx.vy * dt;
        tx.vy *= (1 - dt * 1.6);
        tx.life -= dt;
        if (tx.life <= 0) this.texts.splice(i, 1);
      }
    },

    /* ---------- отрисовка ---------- */
    draw: function () {
      var ctx = this.ctx;
      ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
      var sx = 0, sy = 0;
      if (this.shake > 0.3) {
        sx = rand(-1, 1) * this.shake;
        sy = rand(-1, 1) * this.shake;
      }
      ctx.save();
      ctx.translate(sx, sy);

      if (this.bgCv) ctx.drawImage(this.bgCv, 0, 0, this.W, this.H);
      else { ctx.fillStyle = '#0a0716'; ctx.fillRect(0, 0, this.W, this.H); }

      this.drawStars(ctx);

      if (this.mode !== 'boot' && this.mode !== 'menu') this.drawRings(ctx);
      this.drawPlanet(ctx);
      this.drawAmbient(ctx);

      if (this.mode === 'playing' || this.mode === 'paused' || this.mode === 'dying' || this.mode === 'dead') {
        this.drawObjects(ctx);
        this.drawTrail(ctx);
      }
      this.drawCatNow(ctx);
      this.drawFX(ctx);
      ctx.restore();

      this.drawOverlay(ctx);
    },

    drawStars: function (ctx) {
      var t = this.t;
      for (var i = 0; i < this.stars.length; i++) {
        var s = this.stars[i];
        var a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
        ctx.globalAlpha = a;
        ctx.fillStyle = i % 7 === 0 ? '#cfc0ff' : '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x * this.W, s.y * this.H, s.s, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    drawPlanet: function (ctx) {
      if (!this.planetCv) return;
      var R = this.planetR;
      var s = this.planetSize;
      ctx.save();
      // атмосферное свечение
      var g = ctx.createRadialGradient(this.cx, this.cy, R * 0.85, this.cx, this.cy, R * 2.1);
      g.addColorStop(0, 'rgba(124,92,255,.20)');
      g.addColorStop(1, 'rgba(124,92,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, R * 2.1, 0, TAU);
      ctx.fill();

      ctx.translate(this.cx, this.cy);
      ctx.rotate(this.t * 0.05);
      ctx.drawImage(this.planetCv, -s / 2, -s / 2, s, s);
      ctx.restore();
    },

    drawRings: function (ctx) {
      var active = this.cat.targetLane;
      for (var i = 0; i < this.maxLanes; i++) {
        var r = this.orbits[i];
        var on = i === active;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, r, 0, TAU);
        ctx.setLineDash(on ? [2, 9] : [1, 13]);
        ctx.lineWidth = on ? 2 : 1.4;
        ctx.strokeStyle = on ? 'rgba(178,150,255,.72)' : 'rgba(255,255,255,.22)';
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // третья орбита — намёк
      if (!this.thirdOpen && this.score > 700) {
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.orbits[2], 0, TAU);
        ctx.setLineDash([2, 14]);
        ctx.strokeStyle = 'rgba(139,92,255,' + (0.1 + 0.12 * (0.5 + 0.5 * Math.sin(this.t * 3))) + ')';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },

    drawAmbient: function (ctx) {
      if (this.mode !== 'menu' && this.mode !== 'boot') return;
      for (var i = 0; i < this.ambient.length; i++) {
        var a = this.ambient[i];
        var x = this.cx + Math.cos(a.ang) * a.r + Math.sin(a.ang * 3) * 4;
        var y = this.cy + Math.sin(a.ang) * a.r;
        this.drawGlow(ctx, '#ffd166', x, y, a.size * 2.8, 0.3);
        this.drawFish(ctx, x, y, a.size, a.ang + Math.PI / 2, 0.9, this.t + a.ph);
      }
    },

    drawObjects: function (ctx) {
      var i;
      for (i = 0; i < this.hazards.length; i++) this.drawHazard(ctx, this.hazards[i]);
      for (i = 0; i < this.powers.length; i++) this.drawPower(ctx, this.powers[i]);
      for (i = 0; i < this.fish.length; i++) this.drawFishObj(ctx, this.fish[i]);
    },

    drawHazard: function (ctx, h) {
      var x = this.cx + Math.cos(h.ang) * h.r;
      var y = this.cy + Math.sin(h.ang) * h.r;
      var s = h.size;
      ctx.save();
      ctx.translate(x, y);
      this.drawGlow(ctx, '#ff4d6d', 0, 0, s * 2.3, 0.5 * h.fade);
      ctx.globalAlpha = h.fade;

      ctx.rotate(h.rot);
      ctx.beginPath();
      ctx.moveTo(h.poly[0].x, h.poly[0].y);
      for (var p = 1; p < h.poly.length; p++) ctx.lineTo(h.poly[p].x, h.poly[p].y);
      ctx.closePath();
      ctx.fillStyle = '#3c1c32';
      ctx.fill();
      ctx.lineWidth = Math.max(1.6, s * 0.12);
      ctx.strokeStyle = '#ff6079';
      ctx.stroke();

      // объём: светлая грань
      ctx.beginPath();
      for (var q = 0; q < h.poly.length; q++) {
        var pq = h.poly[q];
        if (q === 0) ctx.moveTo(pq.x * 0.55, pq.y * 0.55); else ctx.lineTo(pq.x * 0.55, pq.y * 0.55);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,140,160,.13)';
      ctx.fill();

      // шипы
      ctx.strokeStyle = 'rgba(255,120,140,.75)';
      ctx.lineWidth = Math.max(1, s * 0.07);
      for (var k = 0; k < h.poly.length; k++) {
        if (k % 2) continue;
        ctx.beginPath();
        ctx.moveTo(h.poly[k].x * 0.9, h.poly[k].y * 0.9);
        ctx.lineTo(h.poly[k].x * 1.22, h.poly[k].y * 1.22);
        ctx.stroke();
      }

      // ядро
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.28, 0, TAU);
      ctx.fillStyle = 'rgba(255,140,120,.55)';
      ctx.fill();
      ctx.restore();
    },

    drawFish: function (ctx, x, y, size, rot, alpha, time) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = alpha;
      var wag = Math.sin((time || 0) * 8) * 0.25;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 1.15, size * 0.72, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-size * 1.0, 0);
      ctx.lineTo(-size * 1.75, -size * 0.75 + wag * size);
      ctx.lineTo(-size * 1.7, size * 0.75 + wag * size);
      ctx.closePath();
      ctx.fillStyle = '#ffb03a';
      ctx.fill();
      ctx.globalAlpha = alpha * 0.9;
      ctx.beginPath();
      ctx.arc(size * 0.5, -size * 0.18, size * 0.14, 0, TAU);
      ctx.fillStyle = '#5a3300';
      ctx.fill();
      ctx.restore();
    },

    drawFishObj: function (ctx, f) {
      var bob = Math.sin(this.t * 3 + f.ph) * 2.2;
      var x = this.cx + Math.cos(f.ang) * (f.r + bob);
      var y = this.cy + Math.sin(f.ang) * (f.r + bob);
      this.drawGlow(ctx, '#ffd166', x, y, f.size * 2.6, 0.55 * f.fade);
      this.drawFish(ctx, x, y, f.size, f.ang + Math.PI / 2, f.fade, this.t + f.ph);
    },

    drawPower: function (ctx, p) {
      var x = this.cx + Math.cos(p.ang) * p.r;
      var y = this.cy + Math.sin(p.ang) * p.r;
      var s = p.size;
      var col = p.type === 'shield' ? '#5cc8ff' : p.type === 'magnet' ? '#ff8ecd' : '#67e8a5';
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = p.fade;
      this.drawGlow(ctx, col, 0, 0, s * 2.4, 0.4 * p.fade);

      ctx.rotate(this.t * 1.2);
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var a = (i / 6) * TAU;
        var px = Math.cos(a) * s, py = Math.sin(a) * s;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(16,12,34,.92)';
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.rotate(-this.t * 1.2);

      // пиктограмма
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = Math.max(1.4, s * 0.14);
      ctx.lineCap = 'round';
      if (p.type === 'shield') {
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.52);
        ctx.lineTo(s * 0.44, -s * 0.3);
        ctx.lineTo(s * 0.44, s * 0.08);
        ctx.quadraticCurveTo(s * 0.4, s * 0.5, 0, s * 0.62);
        ctx.quadraticCurveTo(-s * 0.4, s * 0.5, -s * 0.44, s * 0.08);
        ctx.lineTo(-s * 0.44, -s * 0.3);
        ctx.closePath();
        ctx.stroke();
      } else if (p.type === 'magnet') {
        ctx.beginPath();
        ctx.arc(0, -s * 0.05, s * 0.38, Math.PI, 0, true);
        ctx.lineTo(s * 0.38, s * 0.42);
        ctx.moveTo(-s * 0.38, -s * 0.05);
        ctx.lineTo(-s * 0.38, s * 0.42);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.38, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -s * 0.28);
        ctx.moveTo(0, 0);
        ctx.lineTo(s * 0.22, 0);
        ctx.stroke();
      }
      ctx.restore();
    },

    drawTrail: function (ctx) {
      var n = this.trail.length;
      if (n < 3) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = this.skin.trail;
      var chunks = 6;
      var per = Math.ceil((n - 1) / chunks);
      for (var c = 0; c < chunks; c++) {
        var start = c * per;
        if (start >= n - 1) break;
        var end = Math.min(n - 1, start + per);
        var k = (start + 1) / n;
        ctx.globalAlpha = 0.06 + 0.5 * k * k;
        ctx.lineWidth = Math.max(1, this.catR * 1.15 * k);
        ctx.beginPath();
        for (var i = start; i <= end; i++) {
          var p = this.trail[i];
          if (i === start) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    },

    drawCatNow: function (ctx) {
      if (this.mode === 'dying' || (this.mode === 'dead' && this.deathT <= 0)) return;
      var x = this.catX(), y = this.catY();
      var alpha = 1;
      if (this.invuln > 0) alpha = 0.55 + 0.45 * Math.sin(this.t * 26);
      var blink = this.cat.blink > 0;

      if (this.shield) {
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.25 * Math.sin(this.t * 5);
        ctx.strokeStyle = '#5cc8ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, this.catR * 2, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#5cc8ff';
        ctx.fill();
        ctx.restore();
      }
      if (this.magnetT > 0) {
        ctx.save();
        ctx.globalAlpha = 0.18 + 0.08 * Math.sin(this.t * 8);
        ctx.strokeStyle = '#ff8ecd';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.arc(x, y, this.catR * 5, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      // мягкое свечение под котом
      this.drawGlow(ctx, this.skin.trail, x, y, this.catR * 2.6, 0.75);

      drawCat(ctx, x, y, this.catR, this.skin, this.t, alpha, blink, this.cat.pop);
    },

    hexA: function (hex, a) {
      return rgba(hex, a);
    },

    getGlow: function (color) {
      if (this.glowCache[color]) return this.glowCache[color];
      var s = 96;
      var cv = document.createElement('canvas');
      cv.width = s; cv.height = s;
      var c = cv.getContext('2d');
      var g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, rgba(color, 0.95));
      g.addColorStop(0.35, rgba(color, 0.32));
      g.addColorStop(1, rgba(color, 0));
      c.fillStyle = g;
      c.fillRect(0, 0, s, s);
      this.glowCache[color] = cv;
      return cv;
    },

    glowGrad: function (color, r) {
      var key = color + '|' + r;
      if (!this._gradCache) this._gradCache = {};
      if (this._gradCache[key]) return this._gradCache[key];
      var g = this.ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, rgba(color, 0.9));
      g.addColorStop(0.38, rgba(color, 0.26));
      g.addColorStop(1, rgba(color, 0));
      this._gradCache[key] = g;
      return g;
    },

    drawGlow: function (ctx, color, x, y, size, alpha) {
      if (this.noGlow) return;
      var r = Math.max(8, Math.round(size / 6) * 6);
      var g = this.glowGrad(color, r);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fill();
      ctx.restore();
    },

    drawFX: function (ctx) {
      var i;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (i = 0; i < this.parts.length; i++) {
        var p = this.parts[i];
        var k = clamp(p.life / p.max, 0, 1);
        ctx.globalAlpha = k * 0.9;
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + k * 0.8), 0, TAU);
        ctx.fill();
      }
      for (i = 0; i < this.rings.length; i++) {
        var r = this.rings[i];
        var kk = 1 - r.life / r.max;
        ctx.globalAlpha = (1 - kk) * 0.8;
        ctx.strokeStyle = r.col;
        ctx.lineWidth = r.w * (1 - kk * 0.6);
        ctx.beginPath();
        ctx.arc(r.x, r.y, lerp(r.r, r.r2, kk), 0, TAU);
        ctx.stroke();
      }
      ctx.restore();

      for (i = 0; i < this.texts.length; i++) {
        var tx = this.texts[i];
        var k2 = clamp(tx.life / tx.max, 0, 1);
        ctx.globalAlpha = Math.min(1, k2 * 1.6);
        ctx.fillStyle = tx.col;
        ctx.font = '800 ' + tx.size + 'px "Segoe UI",system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = tx.col;
        ctx.shadowBlur = 10;
        ctx.fillText(tx.text, tx.x, tx.y);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    },

    drawOverlay: function (ctx) {
      // виньетка
      var g = ctx.createRadialGradient(this.cx, this.cy, Math.min(this.W, this.H) * 0.32, this.cx, this.cy, Math.max(this.W, this.H) * 0.78);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,.55)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.W, this.H);

      if (this.slowT > 0) {
        ctx.fillStyle = 'rgba(90,180,255,' + (0.05 + 0.03 * Math.sin(this.t * 6)) + ')';
        ctx.fillRect(0, 0, this.W, this.H);
      }
      if (this.flash > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + (this.flash * 0.5) + ')';
        ctx.fillRect(0, 0, this.W, this.H);
      }
    },

    /* превью для магазина */
    drawSkinPreview: function (canvas, skinId) {
      var ctx = canvas.getContext('2d');
      var dpr = clamp(window.devicePixelRatio || 1, 1, 2);
      var w = canvas.clientWidth || 72;
      canvas.width = w * dpr;
      canvas.height = w * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, w);
      var skin = this.skinById(skinId);
      var cx = w / 2, cy = w / 2 + w * 0.06;
      var r = w * 0.27;
      this.drawGlow(ctx, skin.trail, cx, cy, w * 0.6, 0.5);
      drawCat(ctx, cx, cy, r, skin, this.t, 1, false, 0);
    }
  };

  App.drawCat = drawCat;
  global.App = App;

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });
})(window);
