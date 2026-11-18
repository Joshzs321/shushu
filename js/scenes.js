/* 第 1~4 页：封面（满天星、相机）、胶卷、小餐桌、两只手 */
(function () {
  'use strict';

  var A = window.Anniv;
  var Logic = window.AnnivLogic;
  var $ = A.$;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(name, attrs) {
    var el = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach(function (key) { el.setAttribute(key, attrs[key]); });
    return el;
  }

  /* ========== 1 封面 ========== */
  var anniversary = A.config.anniversaryDate ? Logic.parseDate(A.config.anniversaryDate) : new Date();
  $('days').textContent = Logic.daysTogether(A.config.startDate, anniversary);
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  var ticketDate = anniversary.getFullYear() + '.' + pad2(anniversary.getMonth() + 1) + '.' + pad2(anniversary.getDate());

  (function scatterStars() {
    var random = Logic.seededRandom(1112);
    var html = '';
    for (var i = 0; i < 90; i++) {
      var size = 1 + random() * 2.4;
      html += '<i style="left:' + (random() * 100).toFixed(2) + '%;top:' + (random() * 78).toFixed(2) + '%;width:' + size.toFixed(1) +
        'px;height:' + size.toFixed(1) + 'px;animation-delay:-' + (random() * 3).toFixed(2) + 's;animation-duration:' + (2 + random() * 3).toFixed(2) + 's"></i>';
    }
    $('stars').innerHTML = html;
  })();

  /** 满天星：从左下角长出一丛细枝，枝头开小白花。 */
  function growGypsophila(svg, seed) {
    var random = Logic.seededRandom(seed);
    function branch(x, y, angle, length, depth) {
      var bend = (random() - 0.5) * 0.5;
      var x2 = x + Math.cos(angle) * length;
      var y2 = y - Math.sin(angle) * length;
      var cx = x + Math.cos(angle + bend) * length * 0.55;
      var cy = y - Math.sin(angle + bend) * length * 0.55;
      svg.appendChild(svgEl('path', { d: 'M' + x.toFixed(1) + ' ' + y.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1) }));
      if (depth === 0 || length < 16) {
        var blooms = 1 + Math.floor(random() * 3);
        for (var b = 0; b < blooms; b++) {
          var bloom = svgEl('circle', {
            cx: (x2 + (random() - 0.5) * 12).toFixed(1), cy: (y2 + (random() - 0.5) * 12).toFixed(1), r: (2.2 + random() * 3).toFixed(1),
          });
          if (random() < 0.22) bloom.setAttribute('class', 'is-soft');
          if (random() < 0.3) { bloom.classList.add('is-twinkle'); bloom.style.animationDelay = '-' + (random() * 4).toFixed(2) + 's'; }
          svg.appendChild(bloom);
        }
        return;
      }
      var kids = 2 + (random() < 0.45 ? 1 : 0);
      for (var k = 0; k < kids; k++) {
        branch(x2, y2, angle + (random() - 0.5) * 1.15, length * (0.62 + random() * 0.2), depth - 1);
      }
    }
    for (var stem = 0; stem < 5; stem++) {
      branch(10 + stem * 14, 410, 0.55 + stem * 0.2 + random() * 0.12, 105 + random() * 40, 4);
    }
  }
  growGypsophila($('gypLeft'), 20251112);
  growGypsophila($('gypRight'), 20261112);

  // 封面：photos/第一页 里的照片，一张一张随机撒在页面上
  // （没有 js/cover-photos.js 时，退回用整站的 photos/，保证封面不会空着）
  var coverPhotos = (window.ANNIV_COVER_PHOTOS && window.ANNIV_COVER_PHOTOS.length)
    ? window.ANNIV_COVER_PHOTOS
    : A.photos.map(function (photo) { return { src: photo.thumb, name: photo.caption }; });
  var shotsEl = $('shots');
  // 先把照片读进来，撒的时候就是现成的，不会先闪一下空白
  coverPhotos.forEach(function (photo) { new Image().src = photo.src; });

  function overlaps(a, b, gap) {
    return a.left < b.right + gap && a.right > b.left - gap &&
      a.top < b.bottom + gap && a.bottom > b.top - gap;
  }

  function distance(a, b) {
    var dx = (a.left + a.right) / 2 - (b.left + b.right) / 2;
    var dy = (a.top + a.bottom) / 2 - (b.top + b.bottom) / 2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** 标题、相机、翻页条、静音按钮占的地方：照片先躲开它们，实在放不下才允许压过去。 */
  function keepOutBoxes() {
    var boxes = [];
    [['.cover-body', 12], ['.pager', 10], ['#mute', 6]].forEach(function (item) {
      var el = document.querySelector(item[0]);
      if (!el) return;
      var rect = el.getBoundingClientRect();
      if (!rect.width) return;
      boxes.push({
        left: rect.left - item[1], right: rect.right + item[1],
        top: rect.top - item[1], bottom: rect.bottom + item[1],
      });
    });
    return boxes;
  }

  /** 在页面上找个位置：躲开会压住的东西，和已经撒下去的照片之间还要留出缝。 */
  function pickBox(size, gap, width, height, marginX, marginY, blockers, placed) {
    var best = null;
    var bestScore = -1;
    var reach = Math.sqrt(width * width + height * height) / 2;
    for (var attempt = 0; attempt < 48; attempt++) {
      var x = marginX + Math.random() * Math.max(1, width - size - marginX * 2);
      var y = marginY + Math.random() * Math.max(1, height - size - marginY * 2);
      var box = { left: x, top: y, right: x + size, bottom: y + size };
      if (blockers.some(function (b) { return overlaps(box, b, gap); })) continue;
      if (placed.some(function (p) { return overlaps(box, p, gap); })) continue;
      // 打分：既要和已有照片拉开距离，又要尽量往画面中间靠
      var spread = reach;
      placed.forEach(function (p) { spread = Math.min(spread, distance(box, p)); });
      var dx = (box.left + box.right) / 2 - width / 2;
      var dy = (box.top + box.bottom) / 2 - height / 2;
      var toCenter = Math.sqrt(dx * dx + dy * dy);
      var score = (spread / reach) * 0.58 + (1 - toCenter / reach) * 0.42;
      if (score > bestScore) { bestScore = score; best = box; }
    }
    if (best) return best;

    // 随机撒不下了，就一格一格扫过去，把最后那点空也填上
    for (var top = marginY; top + size <= height - marginY; top += 12) {
      for (var left = marginX; left + size <= width - marginX; left += 12) {
        box = { left: left, top: top, right: left + size, bottom: top + size };
        if (blockers.some(function (b) { return overlaps(box, b, gap); })) continue;
        if (placed.some(function (p) { return overlaps(box, p, gap); })) continue;
        return box;
      }
    }
    return null;
  }

  var spots = [];
  var shotCount = 0;

  /** 按这个尺寸把九张照片都摆下去；有一张摆不下就返回 null。 */
  function layoutAll(size, gap, width, height, marginX, marginY, blockers) {
    var placed = [];
    for (var i = 0; i < coverPhotos.length; i++) {
      var box = pickBox(size, gap, width, height, marginX, marginY, blockers, placed);
      if (!box) return null;
      placed.push(box);
    }
    return placed;
  }

  /**
   * 打开页面时先算好这一轮每张照片落在哪儿。照片尽量大、彼此之间只留一条缝，
   * 出现顺序还是 1、2、3……；实在摆不下才稍微缩一点，保证不压到标题和相机。
   */
  function planSpots() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    var marginX = Math.round(width * 0.04);   // 左右多收一点，照片不贴着屏幕边
    var marginY = Math.round(height * 0.016);
    var base = Math.min(210, Math.max(110, width * 0.15));   // 和 css 里 .shot 的宽度一致
    var blockers = keepOutBoxes();
    var boxes = null;
    var size = base;

    for (var attempt = 0; attempt < 4 && !boxes; attempt++) {
      size = base * (1 - attempt * 0.08);
      var gap = Math.max(8, size * 0.08);
      // 同一尺寸多试几次：位置是随机撒的，换一组随机数往往就摆下了
      for (var retry = 0; retry < 6 && !boxes; retry++) {
        boxes = layoutAll(size, gap, width, height, marginX, marginY, blockers);
      }
    }
    if (!boxes) {
      size = base * 0.72;                                    // 怎么也放不下：退一步，允许压到中间
      boxes = layoutAll(size, 6, width, height, marginX, marginY, []);
    }
    if (!boxes) {
      // 最后的兜底：均匀分格，保证九张都有位置
      var cols = Math.ceil(Math.sqrt(coverPhotos.length));
      var rows = Math.ceil(coverPhotos.length / cols);
      var cellW = width / cols;
      var cellH = height / rows;
      size = Math.min(cellW, cellH) * 0.9;
      boxes = coverPhotos.map(function (_, index) {
        var col = index % cols;
        var row = Math.floor(index / cols);
        return {
          left: col * cellW + (cellW - size) / 2,
          top: row * cellH + (cellH - size) / 2,
          right: col * cellW + (cellW + size) / 2,
          bottom: row * cellH + (cellH + size) / 2,
        };
      });
    }

    spots = (boxes || []).map(function (box) {
      return {
        size: size,
        x: box.left,
        y: box.top,
        rotate: (Math.random() * 2 - 1) * 7,
        side: (box.left + size / 2) < width / 2 ? 'is-left' : 'is-right',
      };
    });
  }

  function makeShot(index, spot, delayMs, animate) {
    var photo = coverPhotos[index];
    var shot = document.createElement('figure');
    shot.className = 'polaroid shot ' + spot.side;
    shot.style.width = spot.size.toFixed(1) + 'px';
    shot.style.left = spot.x.toFixed(1) + 'px';
    shot.style.top = spot.y.toFixed(1) + 'px';
    shot.style.setProperty('--r', spot.rotate.toFixed(1) + 'deg');
    if (animate) shot.style.animationDelay = delayMs + 'ms';
    else shot.style.animation = 'none';

    var img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.name || '我们的照片';
    shot.appendChild(img);
    if (photo.name) {
      var caption = document.createElement('figcaption');
      caption.className = 'shot-name';
      caption.textContent = photo.name;
      shot.appendChild(caption);
    }
    return shot;
  }

  function renderShots(count, stagger) {
    shotsEl.textContent = '';
    for (var i = 0; i < count; i++) shotsEl.appendChild(makeShot(i, spots[i], stagger ? i * 60 : 0, stagger));
  }

  planSpots();
  // 字体加载完标题会变宽一点，重新量一次，照片才不会压到字上（还没开始按快门才重排）
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { if (shotCount === 0) planSpots(); });
  }

  // 窗口大小变了（手机横竖屏切换、拖动窗口）就重新算一遍落点，尺寸才跟得上
  var resizeTimer = 0;
  var lastWidth = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastWidth) return;     // 手机上地址栏收放也会触发 resize，忽略
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      planSpots();
      renderShots(shotCount, false);
    }, 200);
  });

  $('camera').addEventListener('click', function () {
    var camera = this;
    A.flash();
    A.sfx('shutter');
    camera.classList.add('is-snap');
    setTimeout(function () { camera.classList.remove('is-snap'); }, 180);

    if (shotCount >= coverPhotos.length) {
      // 九张都洗出来了：再按就换一套落点，把这一页重新撒一遍
      planSpots();
      renderShots(shotCount, true);
      $('cameraHint').textContent = '再按一下，重新撒一遍';
      return;
    }

    shotsEl.appendChild(makeShot(shotCount, spots[shotCount], 0, true));
    shotCount++;
    $('cameraHint').textContent = shotCount < coverPhotos.length ? '再按一下，还有很多张' : '都洗出来啦，翻页看胶卷 →';
    if (shotCount >= 2) A.nudgeNext('p-cover');
  });

  /* ========== 2 胶卷 ========== */
  // 两排照片分别来自 photos/第二页/第一排、第二排，清单在 js/film-photos.js
  var filmData = window.ANNIV_FILM_PHOTOS || {};
  var placeholders = A.photos.map(function (photo) {
    return { thumb: photo.thumb, full: photo.full, caption: photo.caption };
  });
  var firstRow = (filmData.row1 && filmData.row1.length) ? filmData.row1
    : placeholders.filter(function (_, index) { return index % 2 === 0; });
  var secondRow = (filmData.row2 && filmData.row2.length) ? filmData.row2
    : placeholders.filter(function (_, index) { return index % 2 === 1; });
  var FILM_SPEED = 46;   // 每秒滚过多少像素

  /** 一圈有多长（像素），滚一圈的时长就用它算。 */
  function filmSeconds(strip) {
    var track = strip.querySelector('.strip-track');
    return track ? track.offsetWidth / FILM_SPEED : 0;
  }

  function setFilmSpeed(strip) {
    var reel = strip.querySelector('.strip-reel');
    var seconds = filmSeconds(strip);
    if (reel && seconds > 1) reel.style.setProperty('--dur', seconds.toFixed(1) + 's');
    return seconds;
  }

  /**
   * 一排胶卷：照片连着排两遍（不够一屏就再多排几遍），第二遍紧接在后面，
   * 滚到半圈正好接上；用 CSS 动画一直往左（第二排往右）滚，
   * 鼠标停上去就暂停，点一格看原图。
   */
  function buildStrip(strip, photos, suffix) {
    var reel = document.createElement('div');
    reel.className = 'strip-reel';

    function makeFrame(photo, index, duplicate) {
      var frame = document.createElement('button');
      frame.type = 'button';
      frame.className = 'frame';
      frame.dataset.name = photo.caption || '';
      if (duplicate) {
        frame.tabIndex = -1;
        frame.setAttribute('aria-hidden', 'true');
      } else {
        frame.setAttribute('aria-label', '看原图：' + (photo.caption || '第 ' + (index + 1) + ' 张'));
      }
      var img = document.createElement('img');
      img.src = photo.thumb;
      img.alt = '';
      img.loading = 'lazy';
      img.draggable = false;
      frame.appendChild(img);
      frame.addEventListener('click', function () {
        A.openGallery(photos, index, frame);
      });
      return frame;
    }

    function makeTrack(copies, hidden) {
      var track = document.createElement('div');
      track.className = 'strip-track';
      if (hidden) track.setAttribute('aria-hidden', 'true');
      for (var copy = 0; copy < copies; copy++) {
        photos.forEach(function (photo, index) {
          track.appendChild(makeFrame(photo, index, hidden || copy > 0));
        });
      }
      return track;
    }

    var probe = makeTrack(1, false);
    reel.appendChild(probe);
    strip.appendChild(reel);

    // 一整圈要比一屏还长，不然滚到一半右边会空出来
    var visible = strip.clientWidth || window.innerWidth;
    var trackWidth = probe.offsetWidth || 1;
    var copies = Math.max(1, Math.ceil((visible + 1) / trackWidth));
    reel.textContent = '';
    reel.appendChild(makeTrack(copies, false));
    reel.appendChild(makeTrack(copies, true));

    // 触屏没有“悬停”：手指按下去先停住，松开再继续；鼠标靠 CSS :hover 停
    strip.addEventListener('pointerdown', function () { strip.classList.add('is-paused'); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) {
      strip.addEventListener(type, function () { strip.classList.remove('is-paused'); });
    });

    var seconds = setFilmSpeed(strip);
    // 两排从不同的位置开始滚，看起来不整齐划一
    if (seconds > 1) reel.style.animationDelay = '-' + (Math.random() * seconds).toFixed(1) + 's';
  }

  buildStrip($('stripA'), firstRow, 'A');
  buildStrip($('stripB'), secondRow, 'B');

  var filmResizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(filmResizeTimer);
    filmResizeTimer = setTimeout(function () {
      setFilmSpeed($('stripA'));
      setFilmSpeed($('stripB'));
    }, 200);
  });

  A.onEnter('p-film', function () {
    setTimeout(function () { A.nudgeNext('p-film'); }, 5000);
  });

  /* ========== 3 小餐桌 ========== */
  var table = Logic.createTable(A.config.dishes);
  var dishButtons = {};
  var DISH_RADIUS = 0.37;

  function renderTableCount() {
    var left = Logic.dishesLeftToRemove(table);
    $('tableCount').innerHTML = left > 0 ? '还有 <b>' + left + '</b> 道<br>你不爱吃' : '剩下的<br><b>全是你爱的</b>';
    $('table').classList.toggle('is-done', left === 0);
  }

  table.forEach(function (dish, index) {
    var angle = (index / table.length) * Math.PI * 2 - Math.PI / 2;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dish';
    btn.style.setProperty('--x', (Math.cos(angle) * DISH_RADIUS).toFixed(4));
    btn.style.setProperty('--y', (Math.sin(angle) * DISH_RADIUS).toFixed(4));
    btn.setAttribute('aria-label', dish.name);
    var icon = document.createElement('span');
    icon.className = 'dish-icon';
    icon.textContent = dish.icon;
    icon.setAttribute('aria-hidden', 'true');
    var name = document.createElement('span');
    name.className = 'dish-name';
    name.textContent = dish.name;
    btn.appendChild(icon);
    btn.appendChild(name);
    btn.addEventListener('click', function () { onDish(dish.id); });
    $('table').appendChild(btn);
    dishButtons[dish.id] = btn;
  });

  function onDish(id) {
    var result = Logic.pickDish(table, id);
    var btn = dishButtons[id];
    var dish = table[id];
    table = result.table;
    if (result.outcome === 'removed') {
      btn.classList.add('is-removed');
      btn.disabled = true;
      A.sfx('whoosh');
      $('tableSay').textContent = dish.say || (dish.name + '，撤走。');
    } else if (result.outcome === 'kept') {
      btn.classList.remove('is-kept');
      void btn.offsetWidth;
      btn.classList.add('is-kept');
      A.sfx('nope');
      $('tableSay').textContent = dish.say || (dish.name + '是你的最爱，留下。');
    }
    renderTableCount();
    if (Logic.isTableDone(table) && result.outcome === 'removed') {
      setTimeout(function () {
        $('tableSay').textContent = '菜单记住了。以后每一桌，都照这个来。';
        if (A.currentPageId() === 'p-table') A.sfx('fanfare');
        A.nudgeNext('p-table');
      }, 900);
    }
  }
  renderTableCount();

  /* ========== 4 两只手 ========== */
  function handSvg(options) {
    return '<svg viewBox="0 0 200 400" aria-hidden="true"><g filter="url(#sticker)">' +
      // 袖子 + 手腕
      '<path d="M52 300 L148 300 L164 420 L36 420 Z" fill="url(#' + options.sleeve + ')" stroke="#2b2622" stroke-width="4" stroke-linejoin="round"/>' +
      '<rect x="48" y="292" width="104" height="20" rx="6" fill="' + options.cuff + '" stroke="#2b2622" stroke-width="4"/>' +
      '<path d="M72 236 L128 236 L134 296 L66 296 Z" fill="' + options.skin + '" stroke="#2b2622" stroke-width="4" stroke-linejoin="round"/>' +
      // 握着的拳头
      '<rect x="48" y="168" width="104" height="84" rx="26" fill="' + options.skin + '" stroke="#2b2622" stroke-width="4"/>' +
      // 门票
      '<g transform="rotate(' + options.tilt + ' 100 190)">' +
      '<path d="M46 14 H154 V92 a10 10 0 0 0 0 20 V206 H46 V112 a10 10 0 0 0 0 -20 Z" fill="' + options.ticket + '" stroke="#2b2622" stroke-width="4" stroke-linejoin="round"/>' +
      '<line x1="58" y1="102" x2="142" y2="102" stroke="#2b2622" stroke-width="2.5" stroke-dasharray="6 6"/>' +
      '<text x="100" y="52" text-anchor="middle" font-family="Consolas,monospace" font-weight="700" font-size="30" fill="#2b2622">LIVE</text>' +
      '<text x="100" y="78" text-anchor="middle" font-family="Consolas,monospace" font-size="12" letter-spacing="2" fill="#2b2622">ADMIT ONE</text>' +
      '<text x="100" y="140" text-anchor="middle" font-family="Ma Shan Zheng,KaiTi,serif" font-size="30" fill="#2b2622">' + options.seat + '</text>' +
      '<text x="100" y="164" text-anchor="middle" font-family="Consolas,monospace" font-size="11" fill="#2b2622">' + ticketDate + '</text>' +
      '</g>' +
      // 压在票上的手指和拇指
      '<rect x="38" y="178" width="38" height="66" rx="18" fill="' + options.skin + '" stroke="#2b2622" stroke-width="4" transform="rotate(-8 57 211)"/>' +
      '<path d="M104 190 q20 -6 44 2 M106 210 q20 -6 44 2 M108 230 q18 -5 40 2" fill="none" stroke="#2b2622" stroke-width="3" stroke-linecap="round" opacity=".55"/>' +
      '</g></svg>';
  }
  $('hand1').innerHTML = handSvg({ sleeve: 'sleeveStripe', cuff: '#2f3f66', skin: '#f2c9a5', ticket: '#ffd23f', tilt: -6, seat: 'A排 11座' });
  $('hand2').innerHTML = handSvg({ sleeve: 'sleeveCheck', cuff: '#f3b9bd', skin: '#f7d7bd', ticket: '#f7a8b8', tilt: 6, seat: 'A排 12座' });

  (function buildStageFx() {
    var random = Logic.seededRandom(77);
    var colors = ['#ffd23f', '#f37aa0', '#6eaaff', '#aa78ff', '#7ce0c3'];
    var notes = '';
    var glyphs = ['♪', '♫', '♥', '♪', '✦'];
    for (var i = 0; i < 14; i++) {
      notes += '<i style="--l:' + (4 + random() * 92).toFixed(1) + '%;--s:' + (1.2 + random() * 1.6).toFixed(2) + 'rem;--c:' + colors[i % colors.length] +
        ';--t:' + (5 + random() * 5).toFixed(1) + 's;--dl:-' + (random() * 8).toFixed(1) + 's">' + glyphs[i % glyphs.length] + '</i>';
    }
    $('notes').innerHTML = notes;
    var sticks = '';
    for (var j = 0; j < 22; j++) {
      sticks += '<i style="--h:' + (40 + random() * 60).toFixed(0) + '%;--c:' + colors[j % colors.length] + ';--dl:-' + (random() * 1.1).toFixed(2) + 's"></i>';
    }
    $('sticks').innerHTML = sticks;
  })();

  $('hands').addEventListener('click', function () {
    if ($('p-hands').classList.contains('is-duo')) return;
    $('p-hands').classList.add('is-duo');
    this.setAttribute('aria-pressed', 'true');
    this.setAttribute('aria-label', '两只手，两张连座的门票');
    $('ticketCount').textContent = '2';
    A.sfx('join');
    setTimeout(function () { A.nudgeNext('p-hands'); }, 2200);
  });
})();
