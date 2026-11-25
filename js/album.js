/* 相册：把封面照片、胶卷照片和所有照片汇总成一本相册 */
(function () {
  'use strict';

  var A = window.Anniv;
  if (!A) return;
  var $ = A.$;

  /* 汇总所有照片：封面照片 + 胶卷两排 + 底库照片，去重 */
  var albumPhotos = [];
  var seen = {};

  function addPhoto(thumb, full, caption) {
    if (!thumb || seen[thumb]) return;
    seen[thumb] = true;
    albumPhotos.push({ thumb: thumb, full: full || thumb, caption: caption || '' });
  }

  // 封面照片
  if (window.ANNIV_COVER_PHOTOS && window.ANNIV_COVER_PHOTOS.length) {
    window.ANNIV_COVER_PHOTOS.forEach(function (p) {
      addPhoto(p.src, p.src, p.name);
    });
  }

  // 胶卷照片
  var filmData = window.ANNIV_FILM_PHOTOS || {};
  ['row1', 'row2'].forEach(function (key) {
    if (filmData[key] && filmData[key].length) {
      filmData[key].forEach(function (p) {
        addPhoto(p.thumb, p.full, p.caption);
      });
    }
  });

  // 底库照片（兜底：如果前面的来源都为空，至少保证相册不空）
  A.photos.forEach(function (p) {
    addPhoto(p.thumb, p.full, p.caption);
  });

  // 没有照片就不渲染（页面会空着，但不会报错）
  var grid = $('albumGrid');
  if (!grid || !albumPhotos.length) return;

  albumPhotos.forEach(function (photo, index) {
    var item = document.createElement('figure');
    item.className = 'album-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', '看原图：' + (photo.caption || '第 ' + (index + 1) + ' 张'));

    var img = document.createElement('img');
    img.src = photo.thumb;
    img.alt = photo.caption || '我们的照片';
    img.loading = 'lazy';
    img.draggable = false;
    item.appendChild(img);

    if (photo.caption) {
      var cap = document.createElement('figcaption');
      cap.textContent = photo.caption;
      item.appendChild(cap);
    }

    function open() {
      A.openGallery(albumPhotos, index, item);
    }
    item.addEventListener('click', open);
    item.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
    });
    grid.appendChild(item);
  });

  A.onEnter('p-album', function () {
    setTimeout(function () { A.nudgeNext('p-album'); }, 4000);
  });
})();
