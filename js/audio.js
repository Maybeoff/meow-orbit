/* Процедурный звук: SFX + лёгкая музыка на WebAudio (без внешних файлов) */
(function (global) {
  'use strict';

  var Sound = {
    ctx: null,
    master: null,
    sfxGain: null,
    musicGain: null,
    enabled: true,
    musicOn: true,
    _noise: null,
    _musicTimer: null,
    _nextNote: 0,
    _step: 0,
    _started: false,

    init: function () {
      if (this.ctx) return;
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) { this.enabled = false; return; }
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.85;
        this.master.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.55;
        this.sfxGain.connect(this.master);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.0;
        this.musicGain.connect(this.master);

        var len = Math.floor(this.ctx.sampleRate * 0.6);
        var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        this._noise = buf;
      } catch (e) {
        this.ctx = null;
      }
    },

    unlock: function () {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(function () {});
      }
      if (!this._started) {
        this._started = true;
        if (this.musicOn) this.startMusic();
      }
    },

    setEnabled: function (on) {
      this.enabled = !!on;
      if (this.sfxGain) this.sfxGain.gain.value = on ? 0.55 : 0;
    },

    setMusic: function (on) {
      this.musicOn = !!on;
      if (!on) this.stopMusic();
      else if (this.ctx) this.startMusic();
    },

    suspend: function () {
      if (!this.ctx) return;
      try { this.ctx.suspend(); } catch (e) {}
    },

    resume: function () {
      if (!this.ctx) return;
      try { this.ctx.resume(); } catch (e) {}
    },

    /* ---------- музыка ---------- */
    startMusic: function () {
      if (!this.ctx || this._musicTimer) return;
      var self = this;
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.setTargetAtTime(0.30, this.ctx.currentTime, 0.6);
      this._nextNote = this.ctx.currentTime + 0.15;
      this._step = 0;
      this._musicTimer = setInterval(function () { self._schedule(); }, 120);
      this._schedule();
    },

    stopMusic: function () {
      if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
      if (this.musicGain && this.ctx) {
        this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      }
    },

    _schedule: function () {
      if (!this.ctx || !this.musicOn) return;
      var now = this.ctx.currentTime;
      var stepDur = 60 / 96 / 2; // восьмые при 96 BPM
      var guard = 0;
      while (this._nextNote < now + 0.35 && guard++ < 32) {
        this._playStep(this._step, this._nextNote);
        this._nextNote += stepDur;
        this._step++;
      }
    },

    _playStep: function (step, at) {
      var chords = [
        [57, 60, 64, 69],  // Am
        [53, 57, 60, 65],  // F
        [48, 52, 55, 60],  // C
        [55, 59, 62, 67]   // G
      ];
      var bar = Math.floor(step / 8) % 4;
      var chord = chords[bar];
      var pos = step % 8;
      var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
      var beat = pos === 0;

      // арпеджио
      var arpIdx = [0, 2, 1, 3, 2, 1, 3, 2][pos];
      var arpNote = chord[arpIdx] + (pos === 3 || pos === 6 ? 12 : 0);
      this._pluck(mtof(arpNote), at, 0.09, 0.34, 'triangle');

      // бас
      if (pos === 0 || pos === 4) {
        this._pluck(mtof(chord[0] - 24), at, 0.36, 0.20, 'sine');
      }
      // пэд в начале такта
      if (beat) {
        for (var i = 0; i < 3; i++) {
          this._pad(mtof(chord[i] + 12), at, 3.1, 0.045);
        }
      }
      // лёгкий хай-хэт
      if (pos % 2 === 1) this._hat(at, 0.03);
    },

    _pluck: function (freq, at, dur, gain, type) {
      if (!this.ctx) return;
      var o = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      var f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 2200;
      o.type = type || 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(gain, at + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(f); f.connect(g); g.connect(this.musicGain);
      o.start(at); o.stop(at + dur + 0.02);
    },

    _pad: function (freq, at, dur, gain) {
      if (!this.ctx) return;
      var o = this.ctx.createOscillator();
      var o2 = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      var f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(500, at);
      f.frequency.linearRampToValueAtTime(1400, at + 1.2);
      o.type = 'sawtooth'; o2.type = 'sawtooth';
      o.frequency.value = freq; o2.frequency.value = freq * 1.005;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(gain, at + 0.9);
      g.gain.linearRampToValueAtTime(0.0001, at + dur);
      o.connect(f); o2.connect(f); f.connect(g); g.connect(this.musicGain);
      o.start(at); o2.start(at); o.stop(at + dur); o2.stop(at + dur);
    },

    _hat: function (at, gain) {
      if (!this.ctx || !this._noise) return;
      var s = this.ctx.createBufferSource();
      s.buffer = this._noise;
      var f = this.ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 7000;
      var g = this.ctx.createGain();
      g.gain.setValueAtTime(gain, at);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
      s.connect(f); f.connect(g); g.connect(this.musicGain);
      s.start(at); s.stop(at + 0.06);
    },

    /* ---------- SFX ---------- */
    _tone: function (opt) {
      if (!this.ctx || !this.enabled) return;
      var t = this.ctx.currentTime + (opt.delay || 0);
      var o = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      var f = this.ctx.createBiquadFilter();
      f.type = opt.filter || 'lowpass';
      f.frequency.value = opt.filterFreq || 4000;
      o.type = opt.type || 'sine';
      o.frequency.setValueAtTime(opt.freq, t);
      if (opt.freq2) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.freq2), t + opt.dur);
      var vol = (opt.gain == null ? 0.25 : opt.gain);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + (opt.attack || 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t + opt.dur);
      o.connect(f); f.connect(g); g.connect(this.sfxGain);
      o.start(t); o.stop(t + opt.dur + 0.02);
    },

    _burst: function (dur, gain, freq, type) {
      if (!this.ctx || !this.enabled || !this._noise) return;
      var t = this.ctx.currentTime;
      var s = this.ctx.createBufferSource();
      s.buffer = this._noise;
      var f = this.ctx.createBiquadFilter();
      f.type = type || 'lowpass';
      f.frequency.setValueAtTime(freq || 1400, t);
      f.frequency.exponentialRampToValueAtTime(160, t + dur);
      var g = this.ctx.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.sfxGain);
      s.start(t); s.stop(t + dur + 0.02);
    },

    pickup: function (combo) {
      if (!this.enabled) return;
      var ladder = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
      var semi = ladder[Math.min(ladder.length - 1, combo % ladder.length)];
      var base = 523.25 * Math.pow(2, semi / 12);
      this._tone({ type: 'triangle', freq: base, dur: 0.16, gain: 0.17, filterFreq: 6000 });
      this._tone({ type: 'sine', freq: base * 2, dur: 0.1, gain: 0.06, delay: 0.01 });
    },

    switchLane: function () {
      if (!this.enabled) return;
      this._tone({ type: 'sine', freq: 420, freq2: 900, dur: 0.13, gain: 0.11, filterFreq: 3000 });
      this._burst(0.1, 0.05, 2600, 'highpass');
    },

    coin: function () {
      if (!this.enabled) return;
      this._tone({ type: 'square', freq: 988, dur: 0.07, gain: 0.07 });
      this._tone({ type: 'square', freq: 1319, dur: 0.12, gain: 0.06, delay: 0.06 });
    },

    power: function () {
      if (!this.enabled) return;
      var self = this;
      [523, 659, 784, 1047].forEach(function (f, i) {
        self._tone({ type: 'triangle', freq: f, dur: 0.14, gain: 0.13, delay: i * 0.055 });
      });
    },

    shield: function () {
      if (!this.enabled) return;
      this._tone({ type: 'square', freq: 1200, freq2: 300, dur: 0.28, gain: 0.12 });
      this._burst(0.22, 0.09, 3200, 'bandpass');
    },

    hit: function () {
      if (!this.enabled) return;
      this._tone({ type: 'sawtooth', freq: 180, freq2: 42, dur: 0.5, gain: 0.3, filterFreq: 1200 });
      this._burst(0.42, 0.22, 1800);
    },

    ui: function () {
      if (!this.enabled) return;
      this._tone({ type: 'sine', freq: 660, dur: 0.06, gain: 0.09, filterFreq: 2600 });
    },

    best: function () {
      if (!this.enabled) return;
      var self = this;
      [659, 784, 988, 1319].forEach(function (f, i) {
        self._tone({ type: 'triangle', freq: f, dur: 0.24, gain: 0.12, delay: i * 0.09 });
      });
    },

    fail: function () {
      if (!this.enabled) return;
      this._tone({ type: 'sine', freq: 420, freq2: 200, dur: 0.3, gain: 0.14 });
    }
  };

  global.Sound = Sound;
})(window);
