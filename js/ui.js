/* UI: экраны, HUD, магазин, бонусы, лидерборд, настройки */
(function (global) {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function fmt(n) { return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  var UI = {
    screen: null,
    hudAt: 0,
    lastScore: -1,
    toastTimer: null,
    resetArmed: false,
    resetTimer: null,
    _busy: false,

    init: function () {
      var self = this;

      I18n.set((SDK && SDK.lang) || 'ru');
      I18n.apply();

      Save.init();
      App.setSkin(Save.data.skin);

      this.applySettings();
      this.refreshMenu();
      this.bind();
      this.bindGameHooks();

      Ads.noAds = !!Save.data.noAds;
      Ads.onBefore = function () { Sound.suspend(); };
      Ads.onAfter = function () { Sound.resume(); };

      SDK.onPlatformPause = function () {
        if (App.mode === 'playing') self.onAutoPause();
      };

      // сначала показываем меню, SDK догружаем в фоне
      var menuShown = false;
      var showMenu = function () {
        if (menuShown) return;
        menuShown = true;
        self.showMenu();
        SDK.loadingReady();
      };
      setTimeout(showMenu, 2600);

      SDK.init().then(function () {
        I18n.set(SDK.lang || 'ru');
        I18n.apply();
        self.refreshMenu();
        self.syncToggles();
        showMenu();
        SDK.loadingReady();
        return Save.syncCloud().then(function (changed) {
          if (changed) {
            App.setSkin(Save.data.skin);
            self.applySettings();
            self.refreshMenu();
          }
          if (Save.data.noAds) Ads.noAds = true;
          self.refreshDots();
          self.loadCatalog();
          if (global.SDK && SDK.ysdk) {
            SDK.getPurchases().then(function (list) {
              (list || []).forEach(function (p) {
                if (p.productId === 'no_ads') {
                  Save.data.noAds = true;
                  Ads.noAds = true;
                  Save.save();
                }
              });
            });
          }
        });
      }).catch(function () { showMenu(); });
    },

    bind: function () {
      var self = this;

      $('#btn-play').addEventListener('click', function () { self.play(); });
      $('#btn-shop').addEventListener('click', function () { self.openShop(); });
      $('#btn-daily').addEventListener('click', function () { self.openDaily(); });
      $('#btn-leaders').addEventListener('click', function () { self.openLeaders(); });
      $('#btn-settings').addEventListener('click', function () { self.showScreen('scr-settings'); });
      $('#btn-howto').addEventListener('click', function () { self.showScreen('scr-howto'); });

      $('#btn-pause').addEventListener('click', function () { self.onAutoPause(); });
      $('#btn-resume').addEventListener('click', function () { self.resume(); });
      $('#btn-restart').addEventListener('click', function () { self.play(); });
      $('#btn-pause-menu').addEventListener('click', function () { self.showMenu(); });
      $('#btn-again').addEventListener('click', function () { self.play(); });
      $('#btn-menu').addEventListener('click', function () { self.showMenu(); });
      $('#btn-revive').addEventListener('click', function () { self.revive(); });
      $('#btn-double').addEventListener('click', function () { self.doubleCoins(); });

      $$('[data-close]').forEach(function (b) {
        b.addEventListener('click', function () {
          var scr = b.closest('.screen');
          if (scr && scr.id === 'scr-howto' && App.mode !== 'menu') {
            self.showMenu();
          } else if (scr && (scr.id === 'scr-settings')) {
            self.showMenu();
          } else {
            self.showMenu();
          }
        });
      });

      $$('.tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
          $$('.tab').forEach(function (t) { t.classList.remove('active'); });
          tab.classList.add('active');
          var isCoins = tab.getAttribute('data-tab') === 'coins';
          $('#shop-grid').classList.toggle('hidden', isCoins);
          $('#shop-iap').classList.toggle('hidden', !isCoins);
          Sound.ui();
        });
      });

      $('#btn-claim').addEventListener('click', function () { self.claimDaily(); });
      $('#btn-free-coins').addEventListener('click', function () { self.freeCoins(); });

      $('#btn-t-sound').addEventListener('click', function () { self.toggleSound(); });
      $('#btn-s-sound').addEventListener('click', function () { self.toggleSound(); });
      $('#btn-t-music').addEventListener('click', function () { self.toggleMusic(); });
      $('#btn-s-music').addEventListener('click', function () { self.toggleMusic(); });

      $('#btn-reset').addEventListener('click', function () { self.resetProgress(); });
    },

    bindGameHooks: function () {
      var self = this;
      App.ui = {
        onHud: function (app) { self.updateHud(app); },
        onGameOver: function (res, opts) { self.onGameOver(res, opts); },
        onAutoPause: function () { self.onAutoPause(); },
        onCombo: function () { /* reserved */ },
        onPower: function () { /* reserved */ }
      };
    },

    /* ---------- экраны ---------- */
    hideScreens: function () {
      $$('.screen').forEach(function (s) { s.classList.remove('show'); });
    },

    showScreen: function (id) {
      this.hideScreens();
      var el = $('#' + id);
      if (el) el.classList.add('show');
      $('#hud').classList.add('hidden');
      this.screen = id;
      Sound.ui();
    },

    showHud: function () {
      this.hideScreens();
      $('#hud').classList.remove('hidden');
      this.screen = null;
    },

    showMenu: function () {
      this.hideScreens();
      App.toMenu();
      $('#hud').classList.add('hidden');
      this.refreshMenu();
      $('#scr-menu').classList.add('show');
      this.screen = 'scr-menu';
      if (global.SDK) SDK.gameplayStop();
    },

    /* ---------- игра ---------- */
    play: function () {
      var self = this;
      if (this._busy) return;
      var go = function () {
        self.hideScreens();
        self.showHud();
        App.startRun();
        self.lastScore = -1;
        self.updateHud(App);
        Ads.noteRun();
        if (global.Sound) Sound.ui();
      };
      if (Ads.canShowFullscreen()) {
        this._busy = true;
        Ads.showFullscreen(function () {
          self._busy = false;
          if (Save.data.noAds) Ads.noAds = true;
          go();
        });
      } else {
        go();
      }
    },

    resume: function () {
      this.showHud();
      App.resume();
      Sound.ui();
    },

    onAutoPause: function () {
      if (App.mode !== 'playing') return;
      App.pause();
      this.showScreen('scr-pause');
      this.syncToggles();
    },

    onGameOver: function (res, opts) {
      var self = this;
      this.lastResult = res;
      this.showScreen('scr-over');
      $('#over-score').textContent = fmt(res.score);
      $('#over-best').textContent = fmt(res.best);
      $('#over-fish').textContent = fmt(res.fish);
      $('#over-coins').textContent = '+' + fmt(res.coins);
      $('#over-newbest').classList.toggle('hidden', !res.isNew);
      $('#over-coins').style.color = '';

      var reviveBtn = $('#btn-revive');
      var canRevive = opts && opts.canRevive && Ads.available();
      reviveBtn.classList.toggle('hidden', !canRevive);
      reviveBtn.disabled = false;

      var dbl = $('#btn-double');
      dbl.disabled = false;
      dbl.classList.remove('hidden');
      dbl.querySelector('span').textContent = I18n.t('over.double');

      this.refreshMenu();
      Save.saveNow();

      if (res.isNew) {
        setTimeout(function () {
          self.confetti(res);
        }, 120);
      }
    },

    revive: function () {
      var self = this;
      var btn = $('#btn-revive');
      var prevText = btn.querySelector('span').textContent;
      btn.disabled = true;
      btn.querySelector('span').textContent = I18n.t('common.loading');
      Ads.showRewarded(function () {
        App.revive();
        self.showHud();
        self.lastScore = -1;
        btn.querySelector('span').textContent = prevText;
        btn.disabled = false;
      }, function (reason) {
        btn.querySelector('span').textContent = prevText;
        btn.disabled = false;
        if (reason === 'unavailable') self.toast(I18n.t('toast.adUnavailable'), 'bad');
        else if (reason === 'error' || reason === 'timeout') self.toast(I18n.t('toast.adError'), 'bad');
      }, function () {
        btn.querySelector('span').textContent = prevText;
      });
    },

    doubleCoins: function () {
      var self = this;
      var res = this.lastResult;
      if (!res || res.doubled) return;
      var btn = $('#btn-double');
      var span = btn.querySelector('span');
      btn.disabled = true;
      Ads.showRewarded(function () {
        res.doubled = true;
        Save.addCoins(res.coins);
        $('#over-coins').textContent = '+' + fmt(res.coins * 2);
        $('#over-coins').style.color = '#67e8a5';
        span.textContent = I18n.t('over.doubled');
        btn.disabled = true;
        Sound.coin();
        self.toast(I18n.t('toast.coins', { n: res.coins }), 'good');
        self.refreshMenu();
      }, function (reason) {
        btn.disabled = false;
        if (reason === 'unavailable') self.toast(I18n.t('toast.adUnavailable'), 'bad');
        else if (reason !== 'closed') self.toast(I18n.t('toast.adError'), 'bad');
      });
    },

    updateHud: function (app) {
      var now = performance.now();
      if (now - this.hudAt < 80) return;
      this.hudAt = now;
      var s = Math.floor(app.score);
      if (s !== this.lastScore) {
        this.lastScore = s;
        $('#hud-score').textContent = fmt(s);
      }
      var comboEl = $('#hud-combo');
      var mult = 1 + Math.min(7, Math.floor(app.combo / 4));
      if (app.combo >= 2) {
        comboEl.classList.remove('hidden');
        comboEl.textContent = 'x' + mult + ' · ' + app.combo;
        $('#hud-coins').textContent = fmt(app.coinValue());
      } else {
        comboEl.classList.add('hidden');
        $('#hud-coins').textContent = fmt(app.coinValue());
      }
      var hint = $('#hint');
      if (app.tutorial && app.mode === 'playing') hint.classList.remove('hidden');
      else hint.classList.add('hidden');
    },

    confetti: function () {
      var w = window.innerWidth, h = window.innerHeight;
      for (var i = 0; i < 26; i++) {
        App.parts.push({
          x: Math.random() * w,
          y: -20 - Math.random() * 120,
          vx: (Math.random() - 0.5) * 60,
          vy: 90 + Math.random() * 140,
          life: 2.6, max: 2.6,
          size: 2 + Math.random() * 3,
          col: ['#ffd166', '#ff5fa2', '#8b5cff', '#67e8a5'][i % 4],
          kind: 'spark'
        });
      }
    },

    /* ---------- монеты / меню ---------- */
    refreshMenu: function () {
      var coins = fmt(Save.data.coins || 0);
      $('#menu-coins').textContent = coins;
      $('#hud-coins').textContent = coins;
      $('#shop-coins').textContent = coins;
      $('#daily-coins').textContent = coins;
      $('#leaders-coins').textContent = coins;
      $('#menu-best').textContent = fmt(Save.data.best || 0);
      this.refreshDots();
    },

    refreshDots: function () {
      var d = Save.dailyState();
      var missions = Save.missionsState();
      var canMission = missions.some(function (m) { return m.done && !m.claimed; });
      var free = Save.freeCoinsState();
      $('#dot-daily').classList.toggle('hidden', !(d.canClaim || canMission || (free.left > 0 && free.wait === 0)));
      $('#dot-shop').classList.toggle('hidden', (Save.data.coins || 0) < 150);
    },

    /* ---------- магазин ---------- */
    openShop: function () {
      this.showScreen('scr-shop');
      $$('.tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-tab') === 'skins'); });
      $('#shop-grid').classList.remove('hidden');
      $('#shop-iap').classList.add('hidden');
      this.renderSkins();
      this.renderIap();
      this.refreshMenu();
    },

    renderSkins: function () {
      var self = this;
      var grid = $('#shop-grid');
      grid.innerHTML = '';
      App.SKINS.forEach(function (skin) {
        var owned = Save.ownsSkin(skin.id);
        var equipped = Save.data.skin === skin.id;
        var card = document.createElement('button');
        card.className = 'skin-card' + (equipped ? ' equipped' : owned ? ' owned' : ' locked');
        var cv = document.createElement('canvas');
        card.appendChild(cv);
        var name = document.createElement('div');
        name.className = 'skin-name';
        name.textContent = I18n.t('skins.' + skin.id);
        card.appendChild(name);

        var info = document.createElement('div');
        if (equipped) {
          info.className = 'state';
          info.textContent = I18n.t('shop.equipped');
        } else if (owned) {
          info.className = 'state';
          info.textContent = I18n.t('shop.equip');
          info.style.color = '#c9b6ff';
        } else {
          info.className = 'skin-price';
          info.innerHTML = '<svg><use href="#i-coin"></use></svg><span>' + fmt(skin.price) + '</span>';
        }
        card.appendChild(info);

        if (!owned && (Save.data.coins || 0) >= skin.price) {
          card.classList.add('affordable');
        }

        card.addEventListener('click', function () { self.pickSkin(skin); });
        grid.appendChild(card);

        requestAnimationFrame(function () { App.drawSkinPreview(cv, skin.id); });
      });
    },

    pickSkin: function (skin) {
      if (Save.ownsSkin(skin.id)) {
        if (Save.data.skin !== skin.id) {
          Save.equipSkin(skin.id);
          App.setSkin(skin.id);
          Sound.ui();
          this.renderSkins();
        }
        return;
      }
      if ((Save.data.coins || 0) < skin.price) {
        this.toast(I18n.t('toast.needCoins'), 'bad');
        Sound.fail();
        return;
      }
      var res = Save.buySkin(skin);
      if (res === 'ok') {
        App.setSkin(skin.id);
        Sound.coin();
        this.toast(I18n.t('toast.bought', { name: I18n.t('skins.' + skin.id) }), 'good');
        this.renderSkins();
        this.refreshMenu();
      }
    },

    renderIap: function () {
      var self = this;
      var wrap = $('#shop-iap');
      wrap.innerHTML = '';
      var title = document.createElement('div');
      title.className = 'card-title small';
      title.textContent = I18n.t('shop.iapTitle');
      wrap.appendChild(title);

      var products = this._catalog || [];
      if (!products.length) {
        var note = document.createElement('p');
        note.className = 'text';
        note.textContent = I18n.t('shop.iapSoon');
        wrap.appendChild(note);
      } else {
        products.forEach(function (p) {
          var btn = document.createElement('button');
          btn.className = 'iap-item';
          var ic = document.createElement('div');
          ic.className = 'iap-ic';
          ic.innerHTML = '<svg><use href="#i-coin"></use></svg>';
          btn.appendChild(ic);
          var txt = document.createElement('div');
          txt.className = 'iap-txt';
          var b = document.createElement('b');
          b.textContent = p.title || p.id;
          var small = document.createElement('small');
          small.textContent = p.description || '';
          txt.appendChild(b); txt.appendChild(small);
          btn.appendChild(txt);
          var price = document.createElement('div');
          price.className = 'iap-price';
          price.textContent = p.price || '';
          btn.appendChild(price);
          btn.addEventListener('click', function () { self.buyIap(p); });
          wrap.appendChild(btn);
        });
      }

      var noAds = document.createElement('button');
      noAds.className = 'iap-item';
      noAds.innerHTML = '<div class="iap-ic"><svg><use href="#i-ad"></use></svg></div>' +
        '<div class="iap-txt"><b>' + I18n.t('shop.noAds') + '</b><small>' + I18n.t('shop.noAdsDesc') + '</small></div>';
      if (Save.data.noAds) {
        var st = document.createElement('div');
        st.className = 'iap-price';
        st.textContent = I18n.t('shop.ownedNoAds');
        noAds.appendChild(st);
        noAds.disabled = true;
        noAds.style.opacity = '.6';
      } else {
        noAds.addEventListener('click', function () { self.buyNoAds(); });
      }
      wrap.appendChild(noAds);
    },

    loadCatalog: function () {
      var self = this;
      if (!SDK.pay) return;
      SDK.getCatalog().then(function (list) {
        self._catalog = list || [];
        self.renderIap();
      });
    },

    buyNoAds: function () {
      var self = this;
      if (!SDK.pay) { this.toast(I18n.t('shop.iapSoon'), 'bad'); return; }
      var id = (this._catalog || []).filter(function (p) { return /no_ads|noads|remove/i.test(p.id); })[0];
      var pid = id ? id.id : 'no_ads';
      SDK.purchase(pid).then(function (p) {
        Save.data.noAds = true;
        Ads.noAds = true;
        Save.saveNow();
        Sound.coin();
        self.toast(I18n.t('toast.noAds'), 'good');
        self.renderIap();
      }).catch(function () {
        self.toast(I18n.t('toast.buyFail'), 'bad');
      });
    },

    buyIap: function (p) {
      var self = this;
      SDK.purchase(p.id).then(function (res) {
        var amount = 0;
        if (/100/.test(p.id)) amount = 100;
        if (/500/.test(p.id)) amount = 500;
        if (/1500/.test(p.id)) amount = 1500;
        if (/5000/.test(p.id)) amount = 5000;
        if (res && res.purchaseToken) {
          SDK.consume(res.purchaseToken);
        }
        if (amount) {
          Save.addCoins(amount);
          self.toast(I18n.t('toast.coins', { n: amount }), 'good');
          self.refreshMenu();
          Sound.coin();
        }
      }).catch(function () {
        self.toast(I18n.t('toast.buyFail'), 'bad');
      });
    },

    /* ---------- ежедневки ---------- */
    openDaily: function () {
      this.showScreen('scr-daily');
      this.renderDaily();
      this.renderMissions();
      this.refreshFreeCoins();
      this.refreshMenu();
    },

    renderDaily: function () {
      var row = $('#daily-row');
      row.innerHTML = '';
      var st = Save.dailyState();
      var claimedToday = !st.canClaim;
      for (var i = 0; i < 7; i++) {
        var cell = document.createElement('div');
        var isToday = (st.displayDay - 1) === i;
        cell.className = 'day-cell' + (isToday && st.canClaim ? ' today' : '') + (isToday && claimedToday ? ' claimed' : '');
        var dv = document.createElement('div');
        dv.className = 'dv';
        dv.innerHTML = '<svg><use href="#i-' + (i === 6 ? 'gift' : 'coin') + '"></use></svg>';
        cell.appendChild(dv);
        var b = document.createElement('b');
        b.textContent = Save.DAILY_REWARDS[i];
        cell.appendChild(b);
        var d = document.createElement('div');
        d.textContent = st.canClaim && isToday ? '•' : (i + 1);
        cell.appendChild(d);
        row.appendChild(cell);
      }
      var btn = $('#btn-claim');
      if (st.canClaim) {
        btn.disabled = false;
        btn.textContent = I18n.t('daily.claim');
        btn.classList.remove('hidden');
      } else {
        btn.disabled = true;
        btn.textContent = I18n.t('daily.claimed');
      }
    },

    claimDaily: function () {
      var amount = Save.claimDaily();
      if (!amount) return;
      Sound.coin();
      this.toast(I18n.t('toast.coins', { n: amount }), 'good');
      this.renderDaily();
      this.refreshMenu();
    },

    renderMissions: function () {
      var self = this;
      var wrap = $('#missions');
      wrap.innerHTML = '';
      var list = Save.missionsState();
      list.forEach(function (m, idx) {
        var row = document.createElement('div');
        row.className = 'mission';
        var txt = document.createElement('div');
        txt.className = 'm-txt';
        var name = document.createElement('div');
        name.className = 'm-name';
        name.textContent = I18n.t(m.key);
        var bar = document.createElement('div');
        bar.className = 'm-bar';
        var fill = document.createElement('i');
        fill.style.width = Math.min(100, Math.round((m.value / m.target) * 100)) + '%';
        bar.appendChild(fill);
        var prog = document.createElement('div');
        prog.className = 'm-prog';
        prog.textContent = fmt(m.value) + ' / ' + fmt(m.target);
        txt.appendChild(name); txt.appendChild(bar); txt.appendChild(prog);
        row.appendChild(txt);

        var btn = document.createElement('button');
        btn.className = 'm-claim';
        if (m.claimed) {
          btn.textContent = I18n.t('missions.done');
          btn.disabled = true;
          btn.classList.add('done');
        } else if (m.done) {
          btn.textContent = '+' + m.reward;
          btn.addEventListener('click', function () {
            var got = Save.claimMission(idx);
            if (got) {
              Sound.coin();
              self.toast(I18n.t('toast.coins', { n: got }), 'good');
              self.renderMissions();
              self.refreshMenu();
            }
          });
        } else {
          btn.textContent = '+' + m.reward;
          btn.disabled = true;
        }
        row.appendChild(btn);
        wrap.appendChild(row);
      });
    },

    refreshFreeCoins: function () {
      var st = Save.freeCoinsState();
      var btn = $('#btn-free-coins');
      var label = $('#free-coins-text');
      if (st.left <= 0) {
        label.textContent = I18n.t('daily.freeLeft', { n: 0, max: st.max });
        btn.disabled = true;
        btn.style.opacity = '.5';
      } else if (st.wait > 0) {
        label.textContent = I18n.t('daily.wait', { s: Math.ceil(st.wait / 1000) });
        btn.disabled = true;
        btn.style.opacity = '.6';
        var self = this;
        if (!this._fcTimer) {
          this._fcTimer = setInterval(function () {
            if (UI.screen === 'scr-daily') UI.refreshFreeCoins();
            else { clearInterval(UI._fcTimer); UI._fcTimer = null; }
          }, 1000);
        }
      } else {
        label.textContent = I18n.t('daily.freeLeft', { n: st.left, max: st.max });
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    },

    freeCoins: function () {
      var self = this;
      var st = Save.freeCoinsState();
      if (st.left <= 0 || st.wait > 0) return;
      var btn = $('#btn-free-coins');
      btn.disabled = true;
      Ads.showRewarded(function () {
        var got = Save.useFreeCoins();
        if (got) {
          Sound.coin();
          self.toast(I18n.t('toast.coins', { n: got }), 'good');
        }
        self.refreshFreeCoins();
        self.refreshMenu();
      }, function (reason) {
        if (reason === 'unavailable') self.toast(I18n.t('toast.adUnavailable'), 'bad');
        else if (reason !== 'closed') self.toast(I18n.t('toast.adError'), 'bad');
        self.refreshFreeCoins();
      }, function () {
        self.refreshFreeCoins();
      });
    },

    /* ---------- лидеры ---------- */
    openLeaders: function () {
      this.showScreen('scr-leaders');
      var list = $('#leaders-list');
      list.innerHTML = '<div class="lb-empty">' + I18n.t('leaders.loading') + '</div>';
      var self = this;
      if (!SDK.lb) {
        list.innerHTML = '<div class="lb-empty">' + I18n.t('leaders.error') + '</div>';
        return;
      }
      SDK.getLeaders().then(function (res) {
        var entries = (res && res.leaderboard && res.leaderboard.entries) || [];
        if (!entries.length) {
          list.innerHTML = '<div class="lb-empty">' + I18n.t('leaders.empty') + '</div>';
          return;
        }
        list.innerHTML = '';
        var meName = '';
        try { meName = SDK.player && SDK.player.getName ? SDK.player.getName() : ''; } catch (e) {}
        entries.forEach(function (e) {
          var row = document.createElement('div');
          row.className = 'lb-row';
          var name = (e.player && e.player.publicName) || I18n.t('leaders.anon');
          if (meName && name === meName) row.classList.add('me');
          row.innerHTML = '<div class="lb-rank">' + e.rank + '</div>' +
            '<div class="lb-name"></div>' +
            '<div class="lb-score">' + fmt(e.score) + '</div>';
          row.querySelector('.lb-name').textContent = name;
          list.appendChild(row);
        });
      }).catch(function () {
        list.innerHTML = '<div class="lb-empty">' + I18n.t('leaders.error') + '</div>';
      });
    },

    /* ---------- настройки ---------- */
    syncToggles: function () {
      var s = Save.data.sound !== false;
      var m = Save.data.music !== false;
      [['#btn-t-sound', s], ['#btn-s-sound', s], ['#btn-t-music', m], ['#btn-s-music', m]].forEach(function (pair) {
        var el = $(pair[0]);
        if (!el) return;
        el.classList.toggle('on', pair[1]);
        el.classList.toggle('off', !pair[1]);
      });
    },

    toggleSound: function () {
      Save.data.sound = !Save.data.sound;
      Save.save();
      this.applySettings();
      Sound.ui();
    },

    toggleMusic: function () {
      Save.data.music = !Save.data.music;
      Save.save();
      this.applySettings();
    },

    applySettings: function () {
      Sound.setEnabled(Save.data.sound !== false);
      Sound.setMusic(Save.data.music !== false);
      if (Save.data.music !== false && Sound.ctx && Sound._started) Sound.startMusic();
      this.syncToggles();
    },

    resetProgress: function () {
      var self = this;
      if (!this.resetArmed) {
        this.resetArmed = true;
        $('#btn-reset').textContent = I18n.t('settings.resetAsk');
        clearTimeout(this.resetTimer);
        this.resetTimer = setTimeout(function () {
          self.resetArmed = false;
          $('#btn-reset').textContent = I18n.t('settings.reset');
        }, 3000);
        return;
      }
      clearTimeout(this.resetTimer);
      this.resetArmed = false;
      Save.reset();
      App.setSkin('classic');
      this.applySettings();
      this.refreshMenu();
      $('#btn-reset').textContent = I18n.t('settings.reset');
      this.toast(I18n.t('toast.resetDone'), 'good');
      this.showMenu();
    },

    /* ---------- утилиты ---------- */
    toast: function (text, kind) {
      var el = $('#toast');
      el.textContent = text;
      el.className = 'toast show' + (kind ? ' ' + kind : '');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(function () {
        el.className = 'toast' + (kind ? ' ' + kind : '');
      }, 2400);
    }
  };

  global.UI = UI;

  document.addEventListener('DOMContentLoaded', function () {
    UI.init();
    var tab = null;
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('.tab');
      if (t) tab = t;
    });
  });
})(window);
