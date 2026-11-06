/* Letterpress lettering for headings: the same pressed-ink renderer as the card
   (paper tooth, bevel lit from the top left, ink that skips the paper grain),
   drawn on a transparent canvas so the page paper shows through. */
(function () {
  var S = { ink: [82, 78, 80], grainScale: 0.9, paperRelief: 0.30, impressionDepth: 0.7,
            bevel: 1.0, inkMottle: 0.15, boldness: 0.008, inkEdge: 0.20 };
  var FONT = '"AllenCopperplate", Copperplate, "Copperplate Gothic", serif';
  var PRESETS = {
    mark:  { track: -0.012, space: 0.62, bold: 0.012, align: 'left',   wrap: false },
    h1:    { track: -0.012, space: 0.62, bold: 0.016, align: 'center', wrap: true  },
    role:  { track: -0.025, space: 0.65, bold: 0.014, align: 'center', wrap: true  },
    h1l:   { track: -0.012, space: 0.62, bold: 0.016, align: 'left',   wrap: true  },
    rolel: { track: -0.025, space: 0.65, bold: 0.014, align: 'left',   wrap: true  },
    h2:    { track: -0.012, space: 0.62, bold: 0.014, align: 'left',   wrap: false },
    title: { track: -0.015, space: 0.62, bold: 0.012, align: 'left',   wrap: true  }
  };
  function mk(seed) { var s = seed >>> 0; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ss(a, b, v) { var t = cl((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function vnoise(W, H, cx, cy, seed) {
    var r = mk(seed), gw = Math.ceil(W / cx) + 3, gh = Math.ceil(H / cy) + 3, g = new Float32Array(gw * gh), i, x, y;
    for (i = 0; i < g.length; i++) g[i] = r() * 2 - 1;
    var out = new Float32Array(W * H);
    for (y = 0; y < H; y++) {
      var fy = y / cy, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
      for (x = 0; x < W; x++) {
        var fx = x / cx, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), j = y0 * gw + x0;
        var a = g[j], b = g[j + 1], c = g[j + gw], d = g[j + gw + 1];
        out[y * W + x] = (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
      }
    }
    return out;
  }
  function box(src, W, H, r) {
    var tmp = new Float32Array(W * H), out = new Float32Array(W * H), d = 2 * r + 1, x, y, sum;
    for (y = 0; y < H; y++) {
      var row = y * W; sum = 0;
      for (x = -r; x <= r; x++) sum += src[row + cl(x, 0, W - 1)];
      for (x = 0; x < W; x++) { tmp[row + x] = sum / d; sum += src[row + Math.min(x + r + 1, W - 1)] - src[row + Math.max(x - r, 0)]; }
    }
    for (x = 0; x < W; x++) {
      sum = 0;
      for (y = -r; y <= r; y++) sum += tmp[cl(y, 0, H - 1) * W + x];
      for (y = 0; y < H; y++) { out[y * W + x] = sum / d; sum += tmp[Math.min(y + r + 1, H - 1) * W + x] - tmp[Math.max(y - r, 0) * W + x]; }
    }
    return out;
  }
  function gauss(src, W, H, r) { r = Math.max(1, Math.round(r)); return box(box(box(src, W, H, r), W, H, r), W, H, r); }

  function layout(text, px, o, maxW, mctx) {
    mctx.font = '400 ' + px + 'px ' + FONT;
    var words = text.split(' '), lines = [], cur = [];
    function adv(ch) { return mctx.measureText(ch).width * (ch === ' ' ? o.space : 1) + o.track * px; }
    function wid(str) { var w = 0; Array.from(str).forEach(function (ch) { w += adv(ch); }); return w - o.track * px; }
    words.forEach(function (w) {
      var t = cur.concat([w]).join(' ');
      if (cur.length && wid(t) > maxW) { lines.push(cur.join(' ')); cur = [w]; } else cur = cur.concat([w]);
    });
    if (cur.length) lines.push(cur.join(' '));
    return { lines: lines, wid: wid, adv: adv };
  }

  function render(el) {
    var o = PRESETS[el.dataset.press]; if (!o) return;
    var text = el.dataset.text || (el.querySelector('.pt') ? el.querySelector('.pt').textContent : el.textContent);
    text = text.replace(/\s+/g, ' ').trim();
    if (!el.querySelector('.pt')) { el.dataset.text = text; el.innerHTML = '<span class="pt"></span>'; el.firstChild.textContent = text; }
    var cs = getComputedStyle(el), px = parseFloat(cs.fontSize);
    var lh = parseFloat(cs.lineHeight); if (!lh || isNaN(lh)) lh = px * 1.2;
    var blockEl = o.wrap ? (cs.display === 'inline' || cs.display === 'inline-block' ? el.parentElement : el) : null;
    var avail = blockEl ? blockEl.getBoundingClientRect().width : 1e5;
    if (blockEl && blockEl !== el) { var pcs = getComputedStyle(blockEl); avail -= parseFloat(pcs.paddingLeft) + parseFloat(pcs.paddingRight); }
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var probe = document.createElement('canvas').getContext('2d');
    var L = layout(text, px, o, avail - 2, probe);
    var textW = 0; L.lines.forEach(function (ln) { textW = Math.max(textW, L.wid(ln)); });
    var padX = Math.ceil(px * 0.12) + 4, padY = Math.ceil(px * 0.18);
    var cssW = Math.ceil(o.wrap ? avail : textW) + padX * 2, cssH = Math.ceil(L.lines.length * lh) + padY * 2;
    var W = Math.round(cssW * dpr), H = Math.round(cssH * dpr), N = W * H;
    var mk2 = document.createElement('canvas'); mk2.width = W; mk2.height = H;
    var m2 = mk2.getContext('2d', { willReadFrequently: true });
    m2.scale(dpr, dpr);
    m2.fillStyle = '#000'; m2.strokeStyle = '#000'; m2.lineJoin = 'round'; m2.textBaseline = 'alphabetic';
    m2.font = '400 ' + px + 'px ' + FONT; m2.lineWidth = px * (S.boldness + o.bold);
    L.lines.forEach(function (ln, i) {
      var w = L.wid(ln), x = o.align === 'center' ? (cssW - w) / 2 : padX, y = padY + i * lh + lh / 2 + px * 0.34;
      Array.from(ln).forEach(function (ch) { m2.fillText(ch, x, y); m2.strokeText(ch, x, y); x += L.adv(ch); });
    });
    var pix = m2.getImageData(0, 0, W, H).data, m = new Float32Array(N), i;
    for (i = 0; i < N; i++) m[i] = pix[i * 4 + 3] / 255;

    var uT = dpr, uB = dpr * cl(px / 57, 0.5, 1.5), fz = cl(px / 57, 0.35, 1);
    var tooth = new Float32Array(N), fine = new Float32Array(N);
    [[2.0, 1.7, 0.50], [4.0, 3.2, 0.65], [8.0, 6.0, 0.80], [18.0, 13.0, 0.70], [45.0, 32.0, 0.45]].forEach(function (Ly, k) {
      var n = vnoise(W, H, Ly[0] * uT * S.grainScale, Ly[1] * uT * S.grainScale, 101 + k * 37);
      for (var q = 0; q < N; q++) { tooth[q] += n[q] * Ly[2]; if (k < 3) fine[q] += n[q] * Ly[2]; }
    });
    var cA = vnoise(W, H, 70 * uT, 52 * uT, 901), cB = vnoise(W, H, 26 * uT, 20 * uT, 933), cloud = new Float32Array(N);
    for (i = 0; i < N; i++) cloud[i] = cA[i] * 0.6 + cB[i] * 0.4;
    var s1 = gauss(m, W, H, 0.8 * uB * S.bevel), s2 = gauss(m, W, H, 2.0 * uB * S.bevel);
    var relief = 0.9 * S.paperRelief, depth = 1.6 * S.impressionDepth * fz, height = new Float32Array(N);
    for (i = 0; i < N; i++) height[i] = tooth[i] * relief - (s1[i] * 0.6 + s2[i] * 0.4) * depth * 3.0;

    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d'), img = ctx.createImageData(W, H), out = img.data;
    var rnd = mk(7), k1 = Math.max(1, Math.round(0.9 * uT)), I = S.ink, en = vnoise(W, H, 1.6 * uT, 1.6 * uT, 555);
    for (var y = 0; y < H; y++) {
      var ya = Math.max(0, y - k1), yb = Math.min(H - 1, y + k1);
      for (var x = 0; x < W; x++) {
        var idx = y * W + x, xa = Math.max(0, x - k1), xb = Math.min(W - 1, x + k1);
        var shade = (height[yb * W + xb] - height[ya * W + xa]) * 15;
        var broad = cloud[idx] * 3.0 + tooth[idx];
        var cover = ss(0.5 - S.inkEdge, 0.5 + S.inkEdge, m[idx] + en[idx] * 0.10);
        var valley = cl(-fine[idx] - 0.25, 0, 2); rnd();
        var speck = (rnd() - 0.5) * 0.35;
        var skip = cl(valley * 0.50 * S.inkMottle + speck * S.inkMottle, 0, 0.60);
        var rim = cl((m[idx] - s1[idx]) * 2.2, 0, 1) * 0.10;
        var inkAmt = cover * (1 - skip), near = cl(s2[idx] * 3, 0, 1);
        var emb = (1 - inkAmt) * near * cl(Math.abs(shade) * 0.015, 0, 0.2), op = inkAmt + emb;
        for (var c = 0; c < 3; c++) {
          var ink = I[c] + shade * 0.45 - rim * 14 + broad * 0.3, imp = shade >= 0 ? 255 : 70;
          out[idx * 4 + c] = op > 0 ? cl(Math.round((ink * inkAmt + imp * emb) / op), 0, 255) : 0;
        }
        out[idx * 4 + 3] = Math.round(op * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    cv.className = 'pc'; cv.setAttribute('aria-hidden', 'true');
    cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
    cv.style.margin = (-padY) + 'px ' + (-padX) + 'px';
    var old = el.querySelector('canvas'); if (old) old.remove();
    el.appendChild(cv); el.classList.add('is-pressed');
  }

  var els = Array.prototype.slice.call(document.querySelectorAll('[data-press]'));
  function all() { els.forEach(render); }
  var t = null, lastW = 0;
  function later() { clearTimeout(t); t = setTimeout(function () { var w = document.documentElement.clientWidth; if (w !== lastW) { lastW = w; all(); } }, 150); }
  function start() { lastW = document.documentElement.clientWidth; all(); }
  if (document.fonts && document.fonts.load) { document.fonts.load('400 48px "AllenCopperplate"').then(start, start); } else { start(); }
  window.addEventListener('resize', later);
})();
