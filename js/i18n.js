/* Локализация: RU / EN / TR */
(function () {
  'use strict';

  var I18N = {
    ru: {
      menu: {
        logo1: 'МЯУ',
        logo2: 'ОРБИТА',
        tagline: 'Космический кот, рыбки и астероиды',
        best: 'Рекорд',
        play: 'Играть',
        shop: 'Магазин',
        leaders: 'Лидеры',
        daily: 'Бонусы',
        howto: 'Как играть'
      },
      tutorial: { tap: 'Тапни, чтобы сменить орбиту' },
      over: {
        title: 'Забег окончен',
        newbest: 'Новый рекорд!',
        best: 'Рекорд',
        fish: 'Рыбок',
        coins: 'Монеты',
        continue: 'Продолжить',
        again: 'Ещё раз',
        double: 'Удвоить монеты',
        doubled: 'Монеты удвоены',
        menu: 'В меню'
      },
      common: { ad: 'реклама', ok: 'Понятно', close: 'Закрыть', cancel: 'Отмена', loading: 'Загрузка…' },
      power: { shield: 'ЩИТ', magnet: 'МАГНИТ', slow: 'ЗАМЕДЛЕНИЕ' },
      event: { third: 'ТРЕТЬЯ ОРБИТА!' },
      pause: {
        title: 'Пауза',
        resume: 'Продолжить',
        restart: 'Заново',
        sound: 'Звук',
        music: 'Музыка'
      },
      shop: {
        title: 'Магазин',
        skins: 'Скины',
        coins: 'Монеты',
        buy: 'Купить',
        equip: 'Выбрать',
        equipped: 'Выбран',
        owned: 'Куплен',
        needCoins: 'Не хватает монет',
        iapTitle: 'Наборы монет',
        iapSoon: 'Покупки станут доступны после публикации игры в Яндекс Играх.',
        noAds: 'Убрать рекламу',
        noAdsDesc: 'Без принудительных роликов. Награды за рекламу останутся.',
        ownedNoAds: 'Уже куплено'
      },
      daily: {
        title: 'Бонусы',
        streakTitle: 'Ежедневный бонус',
        claim: 'Забрать',
        claimed: 'Получено',
        freeCoins: 'Бесплатные монеты',
        freeLeft: 'Бесплатные монеты ({n}/{max})',
        wait: 'Через {s} с',
        day: 'День {n}',
        streak: 'Серия: {n} дн.'
      },
      missions: {
        title: 'Задания дня',
        claim: 'Забрать',
        done: 'Готово',
        m1: 'Сыграй 5 забегов',
        m2: 'Собери 40 рыбок',
        m3: 'Набери 2500 очков'
      },
      leaders: {
        title: 'Лидеры',
        loading: 'Загружаем топ…',
        empty: 'Пока пусто. Стань первым!',
        error: 'Рейтинг доступен в Яндекс Играх',
        anon: 'Игрок'
      },
      settings: {
        title: 'Настройки',
        sound: 'Звуки',
        music: 'Музыка',
        controls: 'Управление',
        controlsText: 'Тап, клик или пробел — сменить орбиту. Собирай рыбок, уходи от астероидов. Три рыбки подряд — множитель.',
        reset: 'Сбросить прогресс',
        resetHint: 'Удалит монеты, скины и рекорд.',
        resetAsk: 'Точно сбросить весь прогресс?'
      },
      howto: {
        1: 'Тапай, чтобы перескочить на другую орбиту.',
        2: 'Собирай рыбок — они дают очки и монеты.',
        3: 'Не касайся астероидов. Щит спасает один раз.',
        4: 'На 1000 очков открывается третья орбита.'
      },
      toast: {
        coins: '+{n} монет',
        adUnavailable: 'Реклама недоступна, попробуй позже',
        adError: 'Не удалось показать рекламу',
        rewardFail: 'Награда не получена',
        noAds: 'Реклама отключена. Спасибо!',
        buyFail: 'Покупка не завершена',
        resetDone: 'Прогресс сброшен',
        needCoins: 'Не хватает монет',
        bought: 'Куплено: {name}',
        welcome: 'Добро пожаловать!',
        saved: 'Сохранено'
      },
      skins: {
        classic: 'Мурзик', neon: 'Неон', ninja: 'Ниндзя', robot: 'Робот',
        unicorn: 'Единорог', void: 'Пустота', gold: 'Золотой', lava: 'Лава',
        ice: 'Лёд', cyber: 'Кибер', rainbow: 'Радуга', angel: 'Ангел'
      }
    },

    en: {
      menu: {
        logo1: 'MEOW',
        logo2: 'ORBIT',
        tagline: 'A space cat, fish and asteroids',
        best: 'Best',
        play: 'Play',
        shop: 'Shop',
        leaders: 'Leaders',
        daily: 'Bonuses',
        howto: 'How to play'
      },
      tutorial: { tap: 'Tap to switch orbit' },
      over: {
        title: 'Run over',
        newbest: 'New record!',
        best: 'Best',
        fish: 'Fish',
        coins: 'Coins',
        continue: 'Continue',
        again: 'One more',
        double: 'Double coins',
        doubled: 'Coins doubled',
        menu: 'Menu'
      },
      common: { ad: 'ad', ok: 'Got it', close: 'Close', cancel: 'Cancel', loading: 'Loading…' },
      power: { shield: 'SHIELD', magnet: 'MAGNET', slow: 'SLOW-MO' },
      event: { third: 'THIRD ORBIT!' },
      pause: {
        title: 'Paused',
        resume: 'Resume',
        restart: 'Restart',
        sound: 'Sound',
        music: 'Music'
      },
      shop: {
        title: 'Shop',
        skins: 'Skins',
        coins: 'Coins',
        buy: 'Buy',
        equip: 'Equip',
        equipped: 'Equipped',
        owned: 'Owned',
        needCoins: 'Not enough coins',
        iapTitle: 'Coin packs',
        iapSoon: 'Purchases will be available after the game is published on Yandex Games.',
        noAds: 'Remove ads',
        noAdsDesc: 'No forced interstitials. Rewarded ads stay.',
        ownedNoAds: 'Already purchased'
      },
      daily: {
        title: 'Bonuses',
        streakTitle: 'Daily bonus',
        claim: 'Claim',
        claimed: 'Claimed',
        freeCoins: 'Free coins',
        freeLeft: 'Free coins ({n}/{max})',
        wait: 'In {s}s',
        day: 'Day {n}',
        streak: 'Streak: {n}d'
      },
      missions: {
        title: 'Daily missions',
        claim: 'Claim',
        done: 'Done',
        m1: 'Play 5 runs',
        m2: 'Collect 40 fish',
        m3: 'Score 2500 points'
      },
      leaders: {
        title: 'Leaders',
        loading: 'Loading top…',
        empty: 'Empty for now. Be the first!',
        error: 'Leaderboard is available in Yandex Games',
        anon: 'Player'
      },
      settings: {
        title: 'Settings',
        sound: 'Sound',
        music: 'Music',
        controls: 'Controls',
        controlsText: 'Tap, click or space to switch orbit. Collect fish, dodge asteroids. Three fish in a row — multiplier.',
        reset: 'Reset progress',
        resetHint: 'Deletes coins, skins and record.',
        resetAsk: 'Reset all progress?'
      },
      howto: {
        1: 'Tap to hop to another orbit.',
        2: 'Collect fish — they give points and coins.',
        3: 'Do not touch asteroids. A shield saves you once.',
        4: 'At 1000 points the third orbit opens.'
      },
      toast: {
        coins: '+{n} coins',
        adUnavailable: 'Ad is unavailable, try later',
        adError: 'Could not show the ad',
        rewardFail: 'Reward not received',
        noAds: 'Ads removed. Thank you!',
        buyFail: 'Purchase not completed',
        resetDone: 'Progress reset',
        needCoins: 'Not enough coins',
        bought: 'Bought: {name}',
        welcome: 'Welcome!',
        saved: 'Saved'
      },
      skins: {
        classic: 'Whisker', neon: 'Neon', ninja: 'Ninja', robot: 'Robot',
        unicorn: 'Unicorn', void: 'Void', gold: 'Golden', lava: 'Lava',
        ice: 'Ice', cyber: 'Cyber', rainbow: 'Rainbow', angel: 'Angel'
      }
    },

    tr: {
      menu: {
        logo1: 'MİYAV',
        logo2: 'ORBİT',
        tagline: 'Uzay kedisi, balıklar ve asteroitler',
        best: 'Rekor',
        play: 'Oyna',
        shop: 'Mağaza',
        leaders: 'Liderler',
        daily: 'Bonuslar',
        howto: 'Nasıl oynanır'
      },
      tutorial: { tap: 'Yörünge değiştirmek için dokun' },
      over: {
        title: 'Koşu bitti',
        newbest: 'Yeni rekor!',
        best: 'Rekor',
        fish: 'Balık',
        coins: 'Para',
        continue: 'Devam et',
        again: 'Bir daha',
        double: 'Parayı ikiye katla',
        doubled: 'Para ikiye katlandı',
        menu: 'Menü'
      },
      common: { ad: 'reklam', ok: 'Anladım', close: 'Kapat', cancel: 'İptal', loading: 'Yükleniyor…' },
      power: { shield: 'KALKAN', magnet: 'MIKNATIS', slow: 'YAVAŞ' },
      event: { third: 'ÜÇÜNCÜ YÖRÜNGE!' },
      pause: {
        title: 'Duraklatıldı',
        resume: 'Devam',
        restart: 'Yeniden',
        sound: 'Ses',
        music: 'Müzik'
      },
      shop: {
        title: 'Mağaza',
        skins: 'Görünümler',
        coins: 'Para',
        buy: 'Satın al',
        equip: 'Seç',
        equipped: 'Seçili',
        owned: 'Alındı',
        needCoins: 'Yeterli para yok',
        iapTitle: 'Para paketleri',
        iapSoon: 'Satın almalar oyun yayınlandıktan sonra açılır.',
        noAds: 'Reklamları kaldır',
        noAdsDesc: 'Zorunlu reklam yok. Ödüllü reklamlar kalır.',
        ownedNoAds: 'Zaten alındı'
      },
      daily: {
        title: 'Bonuslar',
        streakTitle: 'Günlük bonus',
        claim: 'Al',
        claimed: 'Alındı',
        freeCoins: 'Bedava para',
        freeLeft: 'Bedava para ({n}/{max})',
        wait: '{s} sn sonra',
        day: 'Gün {n}',
        streak: 'Seri: {n} gün'
      },
      missions: {
        title: 'Günlük görevler',
        claim: 'Al',
        done: 'Bitti',
        m1: '5 koşu oyna',
        m2: '40 balık topla',
        m3: '2500 puan yap'
      },
      leaders: {
        title: 'Liderler',
        loading: 'Yükleniyor…',
        empty: 'Henüz boş. İlk sen ol!',
        error: 'Sıralama Yandex Oyunlarda mevcut',
        anon: 'Oyuncu'
      },
      settings: {
        title: 'Ayarlar',
        sound: 'Sesler',
        music: 'Müzik',
        controls: 'Kontrol',
        controlsText: 'Dokun veya boşluk — yörünge değiştir. Balık topla, asteroitlerden kaç. Üç balık üst üste — çarpan.',
        reset: 'İlerlemeyi sıfırla',
        resetHint: 'Para, görünüm ve rekoru siler.',
        resetAsk: 'Tüm ilerleme sıfırlansın mı?'
      },
      howto: {
        1: 'Başka yörüngeye geçmek için dokun.',
        2: 'Balık topla — puan ve para verir.',
        3: 'Asteroitlere dokunma. Kalkan bir kez kurtarır.',
        4: '1000 puanda üçüncü yörünge açılır.'
      },
      toast: {
        coins: '+{n} para',
        adUnavailable: 'Reklam yok, sonra dene',
        adError: 'Reklam gösterilemedi',
        rewardFail: 'Ödül alınamadı',
        noAds: 'Reklamlar kapatıldı. Teşekkürler!',
        buyFail: 'Satın alma tamamlanmadı',
        resetDone: 'İlerleme sıfırlandı',
        needCoins: 'Yeterli para yok',
        bought: 'Alındı: {name}',
        welcome: 'Hoş geldin!',
        saved: 'Kaydedildi'
      },
      skins: {
        classic: 'Bıyık', neon: 'Neon', ninja: 'Ninja', robot: 'Robot',
        unicorn: 'Tekboynuz', void: 'Boşluk', gold: 'Altın', lava: 'Lav',
        ice: 'Buz', cyber: 'Siber', rainbow: 'Gökkuşağı', angel: 'Melek'
      }
    }
  };

  var current = 'ru';

  function dig(obj, path) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return null;
      cur = cur[parts[i]];
    }
    return cur;
  }

  var I18n = {
    dict: I18N,
    get lang() { return current; },
    set: function (lang) {
      current = I18N[lang] ? lang : 'ru';
      document.documentElement.lang = current;
      try { document.title = I18n.t('app.title'); } catch (e) {}
    },
    t: function (key, vars) {
      var s = dig(I18N[current], key);
      if (typeof s !== 'string') s = dig(I18N.ru, key);
      if (typeof s !== 'string') s = key;
      if (vars) {
        for (var k in vars) {
          if (Object.prototype.hasOwnProperty.call(vars, k)) {
            s = s.split('{' + k + '}').join(vars[k]);
          }
        }
      }
      return s;
    },
    apply: function (root) {
      root = root || document;
      var nodes = root.querySelectorAll('[data-i18n]');
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].textContent = I18n.t(nodes[i].getAttribute('data-i18n'));
      }
      var logos = root.querySelectorAll ? root.querySelectorAll('.logo') : [];
      for (var j = 0; j < logos.length; j++) {
        logos[j].innerHTML = I18n.t('menu.logo1') + '<span>·</span>' + I18n.t('menu.logo2');
      }
    }
  };

  I18N.ru['app'] = { title: 'Мяу-Орбита' };
  I18N.en['app'] = { title: 'Meow Orbit' };
  I18N.tr['app'] = { title: 'Miyav Orbit' };

  window.I18n = I18n;
  window.t = I18n.t;
})();
