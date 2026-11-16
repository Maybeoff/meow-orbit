/* PWA: установка приложения и офлайн-режим */
(function (global) {
  'use strict';

  function $(sel) { return document.querySelector(sel); }

  var PWA = {
    deferred: null,
    standalone: false,
    inited: false,

    init: function () {
      if (this.inited) return;
      this.inited = true;
      var self = this;

      this.standalone = this.isStandalone();

      window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        self.deferred = e;
        self.refresh();
      });

      window.addEventListener('appinstalled', function () {
        self.deferred = null;
        self.refresh();
        if (global.UI && UI.toast) UI.toast(I18n.t('install.done'), 'good');
      });

      window.__pwaSteps = window.__pwaSteps || [];
      window.__pwaSteps.push('init');

      if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && window.top === window.self) {
        window.__pwaSteps.push('sw-if');
        try {
          window.__pwaSteps.push('sw-call');
          navigator.serviceWorker.register('sw.js').then(function () {
            window.__pwaSteps.push('sw-ok');
          }).catch(function (e) {
            window.__pwaSteps.push('sw-err');
            window.__swErr = String((e && (e.name + ': ' + e.message)) || e);
          });
        } catch (e) {
          window.__pwaSteps.push('sw-sync-err');
          window.__swErr = 'sync ' + String((e && (e.name + ': ' + e.message)) || e);
        }
      }

      var open = function () { self.open(); };
      ['#btn-install', '#btn-install-settings'].forEach(function (sel) {
        var el = $(sel);
        if (el) el.addEventListener('click', open);
      });

      this.refresh();
    },

    isStandalone: function () {
      return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        navigator.standalone === true ||
        (document.referrer || '').indexOf('android-app://') === 0;
    },

    isIOS: function () {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    },

    canInstall: function () {
      if (window.top !== window.self) return false;
      return !!this.deferred || (this.isIOS() && !this.standalone);
    },

    refresh: function () {
      var show = !this.standalone && this.canInstall();
      ['#btn-install', '#btn-install-settings'].forEach(function (sel) {
        var el = $(sel);
        if (el) el.classList.toggle('hidden', !show);
      });
      var card = $('#card-install');
      if (card) card.classList.toggle('hidden', this.standalone);
    },

    open: function () {
      var self = this;
      if (this.deferred) {
        this.deferred.prompt();
        this.deferred.userChoice.then(function (res) {
          if (res && res.outcome === 'accepted') self.deferred = null;
          self.refresh();
        }).catch(function () {});
        return;
      }
      this.showHelp();
    },

    showHelp: function () {
      var el = $('#install-text');
      if (el) {
        var key = this.isIOS() ? 'install.ios'
          : (/Android/i.test(navigator.userAgent) ? 'install.android' : 'install.desktop');
        el.setAttribute('data-i18n', key);
        el.textContent = I18n.t(key);
      }
      if (global.UI) UI.showScreen('scr-install');
    }
  };

  global.PWA = PWA;

  document.addEventListener('DOMContentLoaded', function () { PWA.init(); });
})(window);
