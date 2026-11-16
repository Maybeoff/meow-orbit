/* Yandex Games SDK wrapper: реклама, сохранения, лидерборд, покупки.
   Всё опционально — без SDK игра работает в локальном режиме. */
(function (global) {
  'use strict';

  var SDK = {
    ysdk: null,
    player: null,
    lb: null,
    pay: null,
    inited: false,
    isYandex: false,
    lang: 'ru',
    env: {},
    device: 'desktop',
    _reviewAsked: false,
    _gameplayActive: false,

    init: function () {
      var self = this;
      return new Promise(function (resolve) {
        var done = false;
        var finish = function () {
          if (done) return;
          done = true;
          self.inited = true;
          resolve(self);
        };

        // страховка на случай проблем с сетью
        var timer = setTimeout(finish, 8000);

        function boot() {
          if (typeof global.YaGames === 'undefined') {
            clearTimeout(timer);
            finish();
            return;
          }
          global.YaGames.init({ orientation: { value: 'portrait', lock: false } })
            .then(function (ysdk) {
              self.ysdk = ysdk;
              self.isYandex = true;
              try {
                self.env = ysdk.environment || {};
                self.device = (ysdk.deviceInfo && ysdk.deviceInfo.type) || 'desktop';
                if (self.env.i18n && self.env.i18n.lang) self.lang = self.env.i18n.lang;
              } catch (e) {}

              var jobs = [];
              jobs.push(
                ysdk.getPlayer({ scopes: false })
                  .then(function (p) { self.player = p; })
                  .catch(function () {
                    // старый/новый вариант вызова — пробуем без параметров
                    return ysdk.getPlayer()
                      .then(function (p) { self.player = p; })
                      .catch(function () {});
                  })
              );
              jobs.push(
                ysdk.getLeaderboards()
                  .then(function (lb) { self.lb = lb; })
                  .catch(function () {})
              );
              if (ysdk.getPayments) {
                jobs.push(
                  ysdk.getPayments({ signed: false })
                    .then(function (p) { self.pay = p; })
                    .catch(function () {})
                );
              }

              // пауза от платформы
              try {
                if (ysdk.on) {
                  ysdk.on('game_api_pause', function () {
                    if (self.onPlatformPause) self.onPlatformPause();
                  });
                }
              } catch (e) {}

              Promise.all(jobs).then(function () {
                clearTimeout(timer);
                finish();
              });
            })
            .catch(function () {
              clearTimeout(timer);
              finish();
            });
        }
        var skip = /[?&]nosdk=1/.test(global.location.search);
        if (skip || typeof global.YaGames !== 'undefined') { boot(); return; }
        var sc = document.createElement('script');
        sc.src = 'https://yandex.ru/games/sdk/v2';
        sc.onload = function () { boot(); };
        sc.onerror = function () { clearTimeout(timer); finish(); };
        document.head.appendChild(sc);
      });
    },

    loadingReady: function () {
      try {
        if (this.ysdk && this.ysdk.features && this.ysdk.features.LoadingAPI) {
          this.ysdk.features.LoadingAPI.ready();
        }
      } catch (e) {}
    },

    gameplayStart: function () {
      if (this._gameplayActive) return;
      this._gameplayActive = true;
      try {
        if (this.ysdk && this.ysdk.features && this.ysdk.features.GameplayAPI) {
          this.ysdk.features.GameplayAPI.start();
        }
      } catch (e) {}
    },

    gameplayStop: function () {
      if (!this._gameplayActive) return;
      this._gameplayActive = false;
      try {
        if (this.ysdk && this.ysdk.features && this.ysdk.features.GameplayAPI) {
          this.ysdk.features.GameplayAPI.stop();
        }
      } catch (e) {}
    },

    /* ---------- облачные сохранения ---------- */
    loadData: function () {
      var self = this;
      if (!this.player || !this.player.getData) return Promise.resolve(null);
      return this.player.getData(['save'])
        .then(function (data) { return (data && data.save) || null; })
        .catch(function () { return null; });
    },

    saveData: function (obj, flush) {
      if (!this.player || !this.player.setData) return Promise.resolve(false);
      return this.player.setData({ save: obj }, !!flush)
        .then(function () { return true; })
        .catch(function () { return false; });
    },

    /* ---------- лидерборд ---------- */
    setScore: function (score) {
      if (!this.lb || !score) return Promise.resolve(false);
      return this.lb.setLeaderboardScore('score', Math.round(score))
        .then(function () { return true; })
        .catch(function () { return false; });
    },

    getLeaders: function () {
      if (!this.lb) return Promise.reject(new Error('no leaderboard'));
      return this.lb.getLeaderboardEntries('score', {
        quantityTop: 10,
        includeUser: true,
        quantityAround: 3
      });
    },

    /* ---------- покупки ---------- */
    getCatalog: function () {
      if (!this.pay) return Promise.resolve([]);
      return this.pay.getCatalog().catch(function () { return []; });
    },

    purchase: function (id) {
      if (!this.pay) return Promise.reject(new Error('no payments'));
      return this.pay.purchase({ id: id });
    },

    getPurchases: function () {
      if (!this.pay) return Promise.resolve([]);
      return this.pay.getPurchases().catch(function () { return []; });
    },

    consume: function (token) {
      if (!this.pay) return Promise.resolve(false);
      return this.pay.consumePurchase(token)
        .then(function () { return true; })
        .catch(function () { return false; });
    },

    /* ---------- отзыв ---------- */
    requestReview: function (force) {
      var self = this;
      if (this._reviewAsked && !force) return;
      try {
        if (!this.ysdk || !this.ysdk.feedback) return;
        this.ysdk.feedback.canReview().then(function (res) {
          if (res && res.value) {
            self._reviewAsked = true;
            return self.ysdk.feedback.requestReview();
          }
        }).catch(function () {});
      } catch (e) {}
    }
  };

  /* ---------- Реклама ---------- */
  var Ads = {
    busy: false,
    lastFull: 0,
    runsSinceFull: 0,
    mock: false,
    noAds: false,
    onBefore: null,
    onAfter: null,

    init: function () {
      this.mock = /[?&]mockads=1/.test(global.location.search);
    },

    available: function () {
      return !!(SDK.ysdk && SDK.ysdk.adv) || this.mock;
    },

    canShowFullscreen: function () {
      if (!this.available() || this.busy) return false;
      if (this.noAds) return false;
      if (this.runsSinceFull < 2) return false;
      if (Date.now() - this.lastFull < 60000) return false;
      return true;
    },

    noteRun: function () {
      this.runsSinceFull++;
    },

    _pause: function () {
      if (this.onBefore) { try { this.onBefore(); } catch (e) {} }
    },
    _resume: function () {
      if (this.onAfter) { try { this.onAfter(); } catch (e) {} }
    },

    showFullscreen: function (cb) {
      var self = this;
      if (!this.canShowFullscreen()) {
        if (cb) cb(false);
        return;
      }
      this.busy = true;
      this._pause();
      var settled = false;
      var finish = function (shown) {
        if (settled) return;
        settled = true;
        self.busy = false;
        self.lastFull = Date.now();
        self.runsSinceFull = 0;
        self._resume();
        if (cb) cb(shown);
      };

      if (!SDK.ysdk || !SDK.ysdk.adv) {
        // локальный режим
        setTimeout(function () { finish(false); }, 350);
        return;
      }

      try {
        SDK.ysdk.adv.showFullscreenAdv({
          callbacks: {
            onOpen: function () {},
            onClose: function (wasShown) { finish(!!wasShown); },
            onError: function () { finish(false); }
          }
        });
        setTimeout(function () { finish(true); }, 22000);
      } catch (e) {
        finish(false);
      }
    },

    /* onReward — награда, onFail(reason), onDone — всегда после закрытия */
    showRewarded: function (onReward, onFail, onDone) {
      var self = this;
      if (this.busy) { if (onFail) onFail('busy'); return; }
      if (!this.available()) { if (onFail) onFail('unavailable'); if (onDone) onDone(); return; }

      this.busy = true;
      this._pause();
      var gotReward = false;
      var settled = false;

      var finish = function (ok, reason) {
        if (settled) return;
        settled = true;
        self.busy = false;
        self._resume();
        if (ok) { if (onReward) onReward(); }
        else if (onFail) onFail(reason || 'closed');
        if (onDone) onDone();
      };

      if (!SDK.ysdk || !SDK.ysdk.adv) {
        setTimeout(function () { finish(true); }, 700);
        return;
      }

      try {
        SDK.ysdk.adv.showRewardedVideo({
          callbacks: {
            onOpen: function () {},
            onRewarded: function () { gotReward = true; },
            onClose: function () { finish(gotReward, gotReward ? null : 'closed'); },
            onError: function () { finish(false, 'error'); }
          }
        });
        // страховка, если платформа не вернула колбэк
        setTimeout(function () {
          if (!settled) finish(gotReward, gotReward ? null : 'timeout');
        }, 90000);
      } catch (e) {
        finish(false, 'error');
      }
    }
  };

  Ads.init();

  global.SDK = SDK;
  global.Ads = Ads;
})(window);
