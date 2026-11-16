/* Сохранения: localStorage + облако Яндекс Игр */
(function (global) {
  'use strict';

  var KEY = 'meow_orbit_v1';
  var DAY = 86400000;
  var DAILY_REWARDS = [50, 80, 120, 170, 230, 300, 400];
  var FREE_COINS_MAX = 3;
  var FREE_COINS_COOLDOWN = 180000;
  var FREE_COINS_AMOUNT = 80;

  var MISSIONS = [
    { id: 'm1', key: 'missions.m1', target: 5, reward: 60, field: 'runs' },
    { id: 'm2', key: 'missions.m2', target: 40, reward: 120, field: 'fish' },
    { id: 'm3', key: 'missions.m3', target: 2500, reward: 200, field: 'score' }
  ];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function defaults() {
    return {
      v: 1,
      ts: Date.now(),
      best: 0,
      coins: 0,
      runs: 0,
      totalFish: 0,
      skins: ['classic'],
      skin: 'classic',
      sound: true,
      music: true,
      noAds: false,
      tut: false,
      daily: { last: '', streak: 0 },
      missions: { date: '', runs: 0, fish: 0, score: 0, claimed: [false, false, false] },
      rewarded: { day: '', count: 0, nextAt: 0 },
      ads: { lastAt: 0, sinceAd: 0 }
    };
  }

  function dayKey(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }

  function parseDay(s) {
    if (!s) return 0;
    var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
  }

  var Save = {
    data: null,
    DAILY_REWARDS: DAILY_REWARDS,
    MISSIONS: MISSIONS,
    FREE_COINS_MAX: FREE_COINS_MAX,
    FREE_COINS_AMOUNT: FREE_COINS_AMOUNT,

    init: function () {
      var loaded = null;
      try {
        var raw = global.localStorage.getItem(KEY);
        if (raw) loaded = JSON.parse(raw);
      } catch (e) {}
      var def = defaults();
      if (loaded && typeof loaded === 'object') {
        for (var k in def) {
          if (Object.prototype.hasOwnProperty.call(def, k) && loaded[k] !== undefined) def[k] = loaded[k];
        }
        // добиваем вложенные поля
        var dd = defaults();
        ['daily', 'missions', 'rewarded', 'ads'].forEach(function (g) {
          if (!def[g] || typeof def[g] !== 'object') def[g] = dd[g];
          for (var kk in dd[g]) if (def[g][kk] === undefined) def[g][kk] = dd[g][kk];
        });
        if (!Array.isArray(def.skins) || !def.skins.length) def.skins = ['classic'];
      }
      this.data = def;
      this.checkDay();
      return this;
    },

    syncCloud: function () {
      var self = this;
      return global.SDK.loadData().then(function (cloud) {
        if (!cloud || typeof cloud !== 'object') {
          self.save();
          return false;
        }
        if (cloud.ts && cloud.ts > (self.data.ts || 0)) {
          var def = defaults();
          for (var k in def) if (cloud[k] !== undefined) def[k] = cloud[k];
          self.data = def;
          self.checkDay();
          self.persistLocal();
          return true;
        }
        self.save();
        return false;
      }).catch(function () { return false; });
    },

    persistLocal: function () {
      try { global.localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
    },

    save: function () {
      var self = this;
      this.data.ts = Date.now();
      this.persistLocal();
      if (this._saveTimer) clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(function () {
        self._saveTimer = null;
        global.SDK.saveData(clone(self.data), false);
      }, 3000);
    },

    saveNow: function () {
      if (this._saveTimer) { clearTimeout(this._saveTimer); this._saveTimer = null; }
      this.data.ts = Date.now();
      this.persistLocal();
      global.SDK.saveData(clone(this.data), true);
    },

    reset: function () {
      this.data = defaults();
      this.data.ts = Date.now() + 1;
      this.persistLocal();
      global.SDK.saveData(clone(this.data), true);
    },

    /* ---------- валютa ---------- */
    addCoins: function (n) {
      this.data.coins = Math.max(0, Math.round((this.data.coins || 0) + n));
      this.save();
      return this.data.coins;
    },

    spend: function (n) {
      if ((this.data.coins || 0) < n) return false;
      this.data.coins -= n;
      this.save();
      return true;
    },

    addBest: function (score) {
      var isNew = score > (this.data.best || 0);
      if (isNew) this.data.best = Math.round(score);
      this.checkDay();
      if (score > this.data.missions.score) this.data.missions.score = Math.round(score);
      this.save();
      return isNew;
    },

    countRun: function () {
      this.checkDay();
      this.data.runs = (this.data.runs || 0) + 1;
      this.data.missions.runs += 1;
      this.save();
    },

    addFish: function (n) {
      this.data.totalFish = (this.data.totalFish || 0) + n;
      this.checkDay();
      this.data.missions.fish += n;
      this.save();
    },

    /* ---------- ежедневки ---------- */
    checkDay: function () {
      var today = dayKey();
      if (this.data.missions.date !== today) {
        this.data.missions.date = today;
        this.data.missions.runs = 0;
        this.data.missions.fish = 0;
        this.data.missions.score = 0;
        this.data.missions.claimed = [false, false, false];
      }
      if (this.data.rewarded.day !== today) {
        this.data.rewarded.day = today;
        this.data.rewarded.count = 0;
        this.data.rewarded.nextAt = 0;
      }
    },

    dailyState: function () {
      var today = dayKey();
      var last = this.data.daily.last;
      var canClaim = last !== today;
      var streak = this.data.daily.streak || 0;
      var dayIndex = streak % 7;
      if (canClaim && last && parseDay(last) < parseDay(today) - DAY * 0.5) {
        // пропустил день — серия обнулится при получении
      }
      var displayDay = canClaim ? Math.min(7, (streak % 7) + 1) : Math.min(7, streak === 0 ? 1 : ((streak - 1) % 7) + 1);
      return {
        canClaim: canClaim,
        streak: streak,
        dayIndex: dayIndex,
        displayDay: displayDay,
        rewards: DAILY_REWARDS
      };
    },

    claimDaily: function () {
      var st = this.dailyState();
      if (!st.canClaim) return 0;
      var today = dayKey();
      var yesterday = dayKey(new Date(Date.now() - DAY));
      var streak = (this.data.daily.last === yesterday) ? (this.data.daily.streak || 0) + 1 : 1;
      if (streak > 7) streak = 7;
      this.data.daily.last = today;
      this.data.daily.streak = streak;
      var amount = DAILY_REWARDS[Math.min(6, streak - 1)];
      this.addCoins(amount);
      return amount;
    },

    missionsState: function () {
      var self = this;
      this.checkDay();
      return MISSIONS.map(function (m, i) {
        var val = self.data.missions[m.field] || 0;
        var claimed = !!self.data.missions.claimed[i];
        var done = val >= m.target;
        return {
          id: m.id, key: m.key, target: m.target, reward: m.reward,
          value: Math.min(val, m.target), done: done, claimed: claimed
        };
      });
    },

    claimMission: function (index) {
      var list = this.missionsState();
      var m = list[index];
      if (!m || !m.done || m.claimed) return 0;
      this.data.missions.claimed[index] = true;
      this.addCoins(m.reward);
      return m.reward;
    },

    /* ---------- рекламные монеты ---------- */
    freeCoinsState: function () {
      this.checkDay();
      var r = this.data.rewarded;
      var left = Math.max(0, FREE_COINS_MAX - (r.count || 0));
      var wait = Math.max(0, (r.nextAt || 0) - Date.now());
      return { left: left, wait: wait, amount: FREE_COINS_AMOUNT, max: FREE_COINS_MAX };
    },

    useFreeCoins: function () {
      var st = this.freeCoinsState();
      if (st.left <= 0 || st.wait > 0) return 0;
      this.data.rewarded.count = (this.data.rewarded.count || 0) + 1;
      this.data.rewarded.nextAt = Date.now() + FREE_COINS_COOLDOWN;
      this.addCoins(FREE_COINS_AMOUNT);
      return FREE_COINS_AMOUNT;
    },

    /* ---------- реклама: политика ---------- */
    noteAdRun: function () {
      this.data.ads.sinceAd = (this.data.ads.sinceAd || 0) + 1;
      this.save();
    },

    registerAdShown: function () {
      this.data.ads.lastAt = Date.now();
      this.data.ads.sinceAd = 0;
      this.save();
    },

    /* ---------- скины ---------- */
    ownsSkin: function (id) { return this.data.skins.indexOf(id) >= 0; },

    buySkin: function (skin) {
      if (this.ownsSkin(skin.id)) return 'owned';
      if (!this.spend(skin.price)) return 'nocoins';
      this.data.skins.push(skin.id);
      this.data.skin = skin.id;
      this.save();
      return 'ok';
    },

    equipSkin: function (id) {
      if (!this.ownsSkin(id)) return false;
      this.data.skin = id;
      this.save();
      return true;
    }
  };

  global.Save = Save;
  global.dayKey = dayKey;

  // при уходе со страницы стараемся дописать прогресс в облако
  if (global.addEventListener) {
    global.addEventListener('pagehide', function () {
      try {
        if (!Save.data) return;
        Save.data.ts = Date.now();
        Save.persistLocal();
        if (global.SDK && global.SDK.saveData) global.SDK.saveData(clone(Save.data), true);
      } catch (e) {}
    });
  }
})(window);
