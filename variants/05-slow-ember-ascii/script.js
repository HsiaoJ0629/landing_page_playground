/* 10 · Slow Ember
   1. The stage: a campsite drawn as a grid of ASCII characters on a canvas. Scroll progress (0 to 1) moves the
      evening from golden hour to night; everything else (fire, leaves, stars, clouds) animates on its own.
   2. Page effects below the stage: scroll reveal, "decode" headings, typed camp log, ASCII icon frames, equaliser.
   Motion is off under prefers-reduced-motion and in the gallery preview (one still frame instead). */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var embedded = root.classList.contains('is-embedded');
  var still = reduced || embedded;

  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var step = function (a, b, v) { var t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var mix = function (a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; };
  var rgb = function (c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; };
  var rgba = function (c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')'; };
  var hash = function (x, y) { var h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  var tri = function (u) { u -= Math.floor(u); return 1 - Math.abs(u * 2 - 1); };
  function rng(seed) { return function () { seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* =====================================================================================
     1. Stage
     ===================================================================================== */
  (function stage() {
    var track = document.getElementById('camp'), canvas = document.getElementById('scene');
    if (!track || !canvas || !canvas.getContext) return;
    var pin = track.querySelector('.stage__pin'), ctx = canvas.getContext('2d');
    var caps = [].slice.call(track.querySelectorAll('.caption'));
    var clockEl = document.getElementById('clock'), phaseEl = document.getElementById('phase');
    var FONT = '"JetBrains Mono", ui-monospace, "Cascadia Mono", Consolas, monospace';

    // Materials: [day colour, night colour, takes firelight]. Index 0 is "empty".
    var STAR = 1, CLOUD = 2, MTN = 3, MTN_BG = 4, HILL = 5, HILL_BG = 6, PINE = 7, PINE_BG = 8, LEAF_A = 9, LEAF_B = 10, LEAF_C = 11, LEAF_D = 12,
      CANOPY_BG = 13, TRUNK = 14, TENT = 15, TENT_BG = 16, DOOR_BG = 17, GROUND = 18, GROUND_BG = 19, GRASS = 20, LOG = 21, STONE = 22, CAMP = 23, MTN_TEX = 24;
    var MAT = [null,
      [[255, 244, 214], [255, 244, 214], 0],  // star
      [[255, 244, 226], [236, 160, 140], 0],  // cloud
      [[150, 128, 168], [84, 96, 150], 0],    // far mountain ridge
      [[104, 92, 138], [20, 24, 50], 0],      // far mountain body
      [[66, 96, 70], [30, 48, 52], 1],        // hill forest
      [[58, 50, 58], [13, 15, 28], 1],        // hill body
      [[104, 148, 96], [40, 68, 60], 1],      // pine
      [[30, 50, 40], [9, 16, 18], 1],         // pine body
      [[222, 100, 44], [128, 62, 44], 1],     // leaf: rust
      [[240, 154, 52], [140, 90, 48], 1],     // leaf: amber
      [[246, 200, 88], [146, 118, 66], 1],    // leaf: gold
      [[198, 62, 50], [112, 44, 48], 1],      // leaf: red
      [[88, 44, 30], [24, 15, 19], 1],        // maple canopy body
      [[140, 100, 70], [58, 44, 42], 1],      // trunk
      [[255, 240, 206], [160, 148, 138], 1],  // tent lines
      [[200, 134, 66], [62, 46, 44], 1],      // tent canvas
      [[64, 38, 26], [30, 20, 18], 0],        // tent door (lantern-lit at night, see doorCol)
      [[156, 118, 78], [58, 52, 58], 1],      // ground texture
      [[56, 41, 33], [11, 10, 15], 1],        // ground body
      [[178, 150, 78], [66, 70, 62], 1],      // grass line
      [[132, 84, 50], [80, 50, 34], 1],       // logs
      [[160, 154, 148], [78, 80, 94], 1],     // stones
      [[240, 228, 206], [128, 122, 126], 1],  // mug, seat
      [[126, 110, 150], [44, 50, 86], 0]      // far mountain texture
    ];
    var LV = 6, EMBER_FG = [255, 182, 100], EMBER_BG = [112, 54, 24];
    var fg = [], bgc = [];
    for (var m0 = 0; m0 < MAT.length; m0++) { fg.push(new Array(LV + 1)); bgc.push(new Array(LV + 1)); }
    var SKY = [ // scroll position, sky top, sky middle, sky at the horizon
      [0.00, [84, 120, 160], [214, 170, 150], [248, 196, 118]],
      [0.33, [52, 52, 104], [190, 96, 96], [250, 140, 64]],
      [0.60, [18, 20, 54], [70, 46, 96], [150, 72, 90]],
      [1.00, [6, 8, 22], [12, 16, 40], [22, 28, 60]]
    ];
    var FCH = [' ', '.', '.', "'", ':', '^', '*', '(', ')', '%', '&', '#', '@'];
    var FCOL = [null, [150, 40, 18], [176, 48, 18], [200, 58, 20], [222, 72, 22], [238, 92, 26], [246, 114, 32], [250, 134, 40], [255, 164, 56], [255, 192, 80], [255, 216, 112], [255, 234, 160], [255, 246, 210]]
      .map(function (c) { return c && rgb(c); });
    var CHS = []; for (var cc = 0; cc < 128; cc++) CHS.push(String.fromCharCode(cc));

    // Grid state (rebuilt on resize)
    var W = 0, H = 0, C = 0, R = 0, cw = 9, chh = 17, fs = 15, portrait = false;
    var gy = 0, fireX = 0, seatX = 0, tentCx = 0, tentH = 9, FW = 13, FH = 10, lightRad = 300;
    var sch, sm, sbg, slit, sdith, canopy = [], stars = [], heat, leaves = [], flies = [], sparks = [], clouds = [], shoot = null, nextShoot = 6;
    var pinTop = 0;

    function put(x, y, c, m, b) {
      if (x < 0 || y < 0 || x >= C || y >= R) return;
      var i = y * C + x;
      if (c !== null) { sch[i] = c === ' ' ? 0 : c.charCodeAt(0); sm[i] = m; }
      if (b !== undefined) sbg[i] = b;
    }
    var empty = function (x, y) { if (x < 0 || y < 0 || x >= C || y >= R) return false; var i = y * C + x; return !sch[i] && !sbg[i]; };

    function ridge(Hf, fgMat, bgMat, forest) {
      for (var x = 0; x < C; x++) {
        var h = Hf(x), d = (Hf(x + 1) - Hf(x - 1)) / 2, row = gy - 1 - Math.floor(h), fr = h - Math.floor(h), c, mat = fgMat;
        if (forest) {
          var r1 = hash(x, 91);
          c = r1 < 0.6 ? '^' : r1 < 0.78 ? 'A' : r1 < 0.9 ? '*' : 'n';
          var r2 = hash(x, 17); if (r2 < 0.42) mat = LEAF_A + ((r2 * 97) | 0) % 4;
        } else {
          c = d > 0.6 ? '/' : d < -0.6 ? '\\' : fr < 0.25 ? '_' : fr < 0.5 ? '.' : fr < 0.75 ? '-' : "'";
        }
        put(x, row, c, mat);
        for (var y = row + 1; y < gy; y++) {
          var t = hash(x, y), tc = ' ', tm = fgMat;
          if (forest) { if (t < 0.17) { tc = t < 0.11 ? '^' : 'A'; var t2 = hash(y, x); if (t2 < 0.45) tm = LEAF_A + ((t2 * 89) | 0) % 4; } }
          else if (t < 0.035) { tc = t < 0.012 ? "'" : t < 0.024 ? '.' : ':'; tm = MTN_TEX; }
          put(x, y, tc, tm, bgMat);
        }
      }
    }
    function pine(cx, base, h) {
      var fol = h - 2, top = base - h + 1;
      put(cx, top - 1, '^', PINE);
      for (var i = 0; i < fol; i++) {
        var half = 1 + Math.floor(i / 3) + (i % 3), y = top + i;
        for (var x = cx - half; x <= cx + half; x++) put(x, y, x < cx ? '/' : x > cx ? '\\' : '|', PINE, PINE_BG);
      }
      for (var k = 0; k < 2; k++) { put(cx, base - k, '|', TRUNK, PINE_BG); if (h > 15) { put(cx - 1, base - k, '|', TRUNK, PINE_BG); put(cx + 1, base - k, '|', TRUNK, PINE_BG); } }
    }
    function maple(cx, base, rx, ry, trunkH) {
      var cy = base - trunkH - ry + 1, set = '@&%#oO*';
      for (var dy = -ry; dy <= ry; dy++) for (var dx = -rx; dx <= rx; dx++) {
        var x = cx + dx, y = cy + dy, d = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) + (hash(x, y) - 0.5) * 0.3;
        if (d > 1) continue;
        var patch = hash((x + cx) >> 1, y >> 1), leaf = LEAF_A + ((patch * 4) | 0) % 4;
        put(x, y, set[(hash(y, x) * set.length) | 0], leaf, CANOPY_BG);
        if (x >= 0 && x < C && y >= 0 && y < R) canopy.push(y * C + x);
      }
      for (var k = 0; k < trunkH; k++) put(cx, base - k, '|', TRUNK);
      put(cx - 1, base - trunkH + 1, '\\', TRUNK); put(cx + 1, base - trunkH + 1, '/', TRUNK);
    }
    function tent(cx, base, h, doorRows) {
      var d = h - doorRows;
      for (var i = 0; i < h; i++) {
        var y = base - (h - 1) + i, L = cx - 1 - i, Rr = cx + i, last = i === h - 1;
        for (var x = L; x <= Rr; x++) put(x, y, last ? '_' : ' ', TENT, TENT_BG);
        if (i >= d) { var j = i - d, iL = cx - 1 - j, iR = cx + j; for (var x2 = iL; x2 <= iR; x2++) put(x2, y, last ? '_' : ' ', TENT, DOOR_BG); put(iL, y, '/', TENT, TENT_BG); put(iR, y, '\\', TENT, TENT_BG); }
        put(L, y, '/', TENT, TENT_BG); put(Rr, y, '\\', TENT, TENT_BG);
      }
      put(cx - 1, base - h, '`', TENT); // pennant
    }
    function text(x, y, s, m) { for (var i = 0; i < s.length; i++) if (s[i] !== ' ') put(x + i, y, s[i], m); }

    function build() {
      var N = C * R, x, y, i;
      sch = new Uint16Array(N); sm = new Uint8Array(N); sbg = new Uint8Array(N); slit = new Float32Array(N); sdith = new Float32Array(N); canopy = [];
      portrait = H > W * 1.05;
      gy = Math.floor(R * (portrait ? 0.42 : 0.6)); // phones: camp sits high, so the copy has the ground to itself
      var f = portrait ? 0.55 : 1, u = function (xx) { return xx / C; };

      // far range, then a forested hill line
      ridge(function (xx) { return gy * (0.16 + 0.22 * tri(u(xx) * 2.2 * f + 0.15) + 0.08 * tri(u(xx) * 5.3 * f + 0.6) + 0.03 * tri(u(xx) * 12 * f + 0.2)); }, MTN, MTN_BG, false);
      ridge(function (xx) { return gy * (0.09 + 0.045 * Math.sin(u(xx) * 7 * f + 1) + 0.02 * Math.sin(u(xx) * 17 * f + 2.1)); }, HILL, HILL_BG, true);

      // ground
      for (y = gy; y < R; y++) for (x = 0; x < C; x++) {
        var t = hash(x, y + 7), c = ' ', mat = GROUND;
        if (y === gy) { c = t < 0.35 ? '_' : t < 0.5 ? '.' : t < 0.65 ? ',' : t < 0.75 ? '"' : t < 0.85 ? "'" : '-'; mat = GRASS; }
        else if (t < 0.05) c = t < 0.02 ? '.' : t < 0.035 ? ',' : "'";
        else if (t < 0.078) { c = t < 0.06 ? '*' : t < 0.07 ? '%' : '~'; mat = LEAF_A + ((t * 4000) | 0) % 4; }
        put(x, y, c, mat, GROUND_BG);
      }

      // camp layout
      tentH = portrait ? 6 : C < 110 ? 7 : 9;
      FW = portrait || C < 110 ? 9 : 15; FH = portrait ? 8 : 11;
      fireX = Math.round(C * (portrait ? 0.66 : 0.57));
      tentCx = fireX - (portrait ? 14 : Math.round(13 + tentH * 1.6));
      seatX = fireX + (portrait ? 6 : 10);
      var base = gy - 1, k = portrait ? 0.95 : Math.max(0.7, Math.min(1.3, gy / 34));
      var trees = portrait
        ? [[0.03, 'p', 1, 0], [0.17, 'm', 0.72, 0], [0.97, 'p', 1.1, 0]]
        : [[0.17, 'p', 0.8, 0], [0.235, 'm', 0.72, 0], [0.105, 'm', 1, 0], [0.76, 'm', 0.8, 0], [0.83, 'p', 0.9, 0], [0.035, 'p', 1.15, 1], [0.9, 'm', 1.1, 1], [0.965, 'p', 1.25, 1]];
      var draw = function (tr) {
        var cx = Math.round(tr[0] * C), s = tr[2] * k;
        if (tr[1] === 'p') pine(cx, base + tr[3], Math.round(16 * s));
        else maple(cx, base + tr[3], Math.max(3, Math.round(7 * s)), Math.max(2, Math.round(4.2 * s)), Math.max(2, Math.round(4 * tr[2])));
      };
      trees.filter(function (tr) { return !tr[3]; }).forEach(draw);
      tent(tentCx, base, tentH, tentH >= 9 ? 5 : 3);
      var logs = FW > 9 ? 'o(=========)o' : 'o(=====)o';
      text(fireX - (logs.length >> 1), base, logs.replace(/o/g, ' '), LOG);
      put(fireX - (logs.length >> 1), base, 'o', STONE); put(fireX + (logs.length >> 1), base, 'o', STONE);
      text(seatX, base, '(======)', LOG); text(seatX + 2, base - 1, 'c[_]', CAMP);
      trees.filter(function (tr) { return tr[3]; }).forEach(draw);

      // firelight falloff per cell, plus a little dither so the light edge breaks up into characters
      lightRad = Math.max(240, Math.min(W, H) * 0.62);
      for (y = 0; y < R; y++) for (x = 0; x < C; x++) {
        i = y * C + x;
        var dd = Math.hypot((x - fireX) * cw, (y - (gy - 3)) * chh);
        slit[i] = Math.pow(Math.max(0, 1 - dd / lightRad), 1.6); sdith[i] = (hash(x + 3, y + 11) - 0.5) * 0.9;
      }

      // sky and particles (seeded, so a resize keeps the same sky)
      var rnd = rng(20261112);
      stars = [];
      for (i = 0; i < Math.floor(C * gy * 0.022); i++) {
        var sx = (rnd() * C) | 0, sy = (rnd() * (gy - 2)) | 0, r = rnd();
        if (empty(sx, sy)) stars.push({ x: sx, y: sy, c: r < 0.07 ? '*' : r < 0.2 ? '+' : '.', th: rnd() * 0.85, ph: rnd() * 6.28, sp: 0.6 + rnd() * 1.8 });
      }
      leaves = [];
      for (i = 0; i < Math.round(C * (portrait ? 0.3 : 0.22)); i++) leaves.push({ x: rnd() * C, y: rnd() * gy, vy: 1.6 + rnd() * 2.2, amp: 0.8 + rnd() * 2.4, sp: 0.5 + rnd() * 1.2, ph: rnd() * 6.28, m: LEAF_A + ((rnd() * 4) | 0), land: gy + ((rnd() * Math.max(1, R - gy - 1)) | 0), rest: 0 });
      flies = [];
      for (i = 0; i < (portrait ? 7 : 14); i++) flies.push({ x: rnd() * C, y: gy - 2 - rnd() * gy * 0.3, ph: rnd() * 6.28, sp: 0.7 + rnd() * 1.3 });
      clouds = [{ x: C * 0.12, y: Math.round(gy * 0.12), v: 0.5, s: 0 }, { x: C * 0.5, y: Math.round(gy * 0.3), v: 0.32, s: 1 }, { x: C * 0.85, y: Math.round(gy * 0.2), v: 0.42, s: 0 }];
      sparks = []; shoot = null;
      heat = []; for (y = 0; y < FH; y++) heat.push(new Uint8Array(FW));
    }

    function resize() {
      W = canvas.clientWidth; H = canvas.clientHeight; // the canvas, not the pin: under reduced motion the pin also holds the stacked captions
      if (!W || !H) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      fs = W < 480 ? 11 : W < 900 ? 13 : W < 1500 ? 15 : 17;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = '500 ' + fs + 'px ' + FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      cw = ctx.measureText('MMMMMMMMMM').width / 10; chh = Math.round(fs * 1.14);
      C = Math.ceil(W / cw); R = Math.ceil(H / chh);
      pinTop = parseFloat(getComputedStyle(pin).top) || 0;
      build();
    }

    var CLOUDS = [['    .--.    ', ' .-(    ).  ', '(___.__)__) '], ['   .-~~-.     ', ' .(      )-.  ', '(___________) ']];

    function tickFire(fireOn) {
      var c = (FW - 1) / 2, x, y;
      for (x = 0; x < FW; x++) {
        var shape = 1 - Math.pow(Math.abs(x - c) / (c + 0.6), 2);
        heat[FH - 1][x] = Math.round(12 * fireOn * shape * (0.7 + 0.3 * Math.random()));
      }
      var dk = 2.6 * (11 / FH);
      for (y = 0; y < FH - 1; y++) for (x = 0; x < FW; x++) {
        var sx = Math.min(FW - 1, Math.max(0, x + ((Math.random() * 3) | 0) - 1));
        var edge = Math.abs(x - c) / (c + 0.5);
        heat[y][x] = Math.max(0, heat[y + 1][sx] - ((Math.random() * dk * (0.45 + 1.5 * edge * edge) + 0.35) | 0));
      }
    }

    var fireAcc = 0, prevFire = 0, lastClock = '';
    function draw(p, t, dt) {
      var n = step(0.08, 0.72, p), fireOn = step(0.47, 0.62, p), starVis = step(0.42, 0.9, p), lantern = step(0.5, 0.6, p);
      var flick = 0.86 + 0.14 * Math.sin(t * 9.1) * Math.sin(t * 5.3 + 1), fireI = fireOn * flick, x, y, i, a;
      var horizon = gy * chh, oy = chh / 2;
      var cell = function (c, xx, yy) { ctx.fillText(c, xx * cw, yy * chh + oy); };

      // colour grade for this moment
      for (var m = 1; m < MAT.length; m++) {
        var b = mix(MAT[m][0], MAT[m][1], n);
        for (var L = 0; L <= LV; L++) { var kk = MAT[m][2] ? L / LV * 0.8 : 0; fg[m][L] = rgb(mix(b, EMBER_FG, kk)); bgc[m][L] = rgb(mix(b, EMBER_BG, kk * 0.85)); }
      }
      var doorCol = rgb(mix(mix(MAT[DOOR_BG][0], MAT[DOOR_BG][1], n), [255, 186, 96], lantern * (0.86 + 0.14 * Math.sin(t * 3.1))));

      // sky
      var k0 = 0; while (k0 < SKY.length - 2 && p > SKY[k0 + 1][0]) k0++;
      var kt = clamp01((p - SKY[k0][0]) / (SKY[k0 + 1][0] - SKY[k0][0]));
      var g = ctx.createLinearGradient(0, 0, 0, horizon);
      g.addColorStop(0, rgb(mix(SKY[k0][1], SKY[k0 + 1][1], kt))); g.addColorStop(0.62, rgb(mix(SKY[k0][2], SKY[k0 + 1][2], kt))); g.addColorStop(1, rgb(mix(SKY[k0][3], SKY[k0 + 1][3], kt)));
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      // sun: sets behind the range. moon: rises on the other side.
      var sunset = step(0.05, 0.5, p), sunX = C * (portrait ? 0.74 : 0.7), sunY = lerp(gy * 0.2, gy + 4, step(0, 0.52, p)), sunR = Math.max(2.2, Math.min(5, gy * 0.11));
      var moonA = step(0.5, 0.64, p), moonX = C * (portrait ? 0.22 : 0.2), moonY = lerp(gy + 2, gy * 0.2, step(0.5, 1, p)), moonR = Math.max(2.6, Math.min(4.6, gy * 0.1));
      var glow = function (cx, cy, rad, col, al) { if (al <= 0.004) return; var gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad); gg.addColorStop(0, rgba(col, al)); gg.addColorStop(1, rgba(col, 0)); ctx.fillStyle = gg; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); };
      glow(sunX * cw, Math.min(sunY * chh, horizon), H * 0.75, mix([255, 226, 150], [255, 120, 60], sunset), 0.55 * (1 - step(0.5, 0.74, p)));
      glow(moonX * cw, moonY * chh, H * 0.3, [200, 214, 255], 0.22 * moonA);

      // stars, one at a time
      if (starVis > 0) {
        ctx.fillStyle = fg[STAR][0];
        for (i = 0; i < stars.length; i++) { var s = stars[i]; a = clamp01((starVis - s.th) * 5) * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)); if (a > 0.03) { ctx.globalAlpha = a; cell(s.c, s.x, s.y); } }
      }
      // a shooting star now and then, once it is properly dark
      if (p > 0.8 && !still) {
        if (!shoot && t > nextShoot) shoot = { x: C * (0.1 + Math.random() * 0.4), y: 1 + Math.random() * gy * 0.25, life: 0 };
        if (shoot) {
          shoot.life += dt; shoot.x += 34 * dt; shoot.y += 9 * dt;
          for (var q = 0; q < 9; q++) { var qx = Math.round(shoot.x - q * 1.7), qy = Math.round(shoot.y - q * 0.45); if (empty(qx, qy)) { ctx.globalAlpha = (1 - q / 9) * clamp01(1.4 - shoot.life); cell(q === 0 ? '*' : q < 4 ? '-' : '.', qx, qy); } }
          if (shoot.life > 1.4) { shoot = null; nextShoot = t + 6 + Math.random() * 7; }
        }
      }
      // sun and moon as shaded ASCII discs
      var disc = function (cx, cy, rr, col1, col2, al, crescent) {
        if (al <= 0.01) return; ctx.globalAlpha = al;
        var rx = rr * chh / cw;
        for (var yy = Math.floor(cy - rr); yy <= Math.ceil(cy + rr); yy++) for (var xx = Math.floor(cx - rx); xx <= Math.ceil(cx + rx); xx++) {
          var dx = (xx - cx) / rx, dy = (yy - cy) / rr, d = Math.hypot(dx, dy);
          if (d > 1 || !empty(xx, yy)) continue;
          if (crescent) { var e = Math.min(1 - d, Math.hypot(dx - 0.5, dy + 0.16) - 0.9); if (e < 0) continue; ctx.fillStyle = rgb(mix(col2, col1, clamp01(e * 6))); cell(e > 0.1 ? '@' : 'O', xx, yy); continue; }
          ctx.fillStyle = rgb(mix(col1, col2, d)); cell(d < 0.5 ? '@' : d < 0.8 ? 'O' : 'o', xx, yy);
        }
      };
      disc(sunX, sunY, sunR, mix([255, 244, 190], [255, 170, 84], sunset), mix([255, 200, 100], [236, 88, 50], sunset), 1, false);
      disc(moonX, moonY, moonR, [252, 246, 222], [206, 204, 190], moonA, true);

      // clouds and a small flock, both gone by dusk
      var cloudA = (1 - step(0.3, 0.62, p)) * 0.92;
      if (cloudA > 0.02) {
        ctx.globalAlpha = cloudA; ctx.fillStyle = fg[CLOUD][0];
        clouds.forEach(function (cl) {
          var rows = CLOUDS[cl.s], cx0 = Math.round(((cl.x + t * cl.v) % (C + 30)) - 15);
          for (var ry = 0; ry < rows.length; ry++) for (var rx2 = 0; rx2 < rows[ry].length; rx2++) { var ch = rows[ry][rx2]; if (ch !== ' ' && empty(cx0 + rx2, cl.y + ry)) cell(ch, cx0 + rx2, cl.y + ry); }
        });
      }
      var birdA = 1 - step(0.24, 0.42, p);
      if (birdA > 0.02) {
        ctx.globalAlpha = birdA * 0.85; ctx.fillStyle = 'rgb(58,44,60)';
        var bx = C * 1.05 - ((t * 2.4) % (C * 1.5)), by = gy * 0.3;
        [[0, 0], [3, 1], [6, 2], [3, -1], [7, -2]].forEach(function (o, bi) { var X = Math.round(bx + o[0]), Y = Math.round(by + o[1] + Math.sin(t * 0.7 + bi) * 0.6); if (empty(X, Y)) cell(Math.sin(t * 5 + bi * 1.7) > 0 ? 'v' : '-', X, Y); });
      }
      ctx.globalAlpha = 1;

      // the camp itself: silhouettes first (cell backgrounds), then their characters
      var lv = function (ii) { if (fireI <= 0) return 0; var v = slit[ii] * fireI * LV + sdith[ii]; return v < 0 ? 0 : v > LV ? LV : (v + 0.5) | 0; };
      for (y = 0; y < R; y++) {
        var run = -1, col = null, row = y * C;
        for (x = 0; x <= C; x++) {
          var c2 = null;
          if (x < C) { var bm = sbg[row + x]; if (bm) c2 = bm === DOOR_BG ? doorCol : bgc[bm][lv(row + x)]; }
          if (c2 !== col) { if (col) { ctx.fillStyle = col; var x0 = Math.round(run * cw); ctx.fillRect(x0, y * chh, Math.round(x * cw) - x0, chh); } col = c2; run = x; }
        }
      }
      // warm spill from the fire and the tent lantern
      if (fireI > 0 || lantern > 0) {
        ctx.globalCompositeOperation = 'lighter';
        glow(fireX * cw, (gy - 3) * chh, lightRad * 1.05, [255, 118, 36], 0.3 * fireI);
        glow(fireX * cw, (gy - 3) * chh, FH * chh * 0.9, [255, 150, 50], 0.42 * fireI);
        glow(tentCx * cw, (gy - 2) * chh, tentH * chh * 1.5, [255, 150, 60], 0.16 * lantern);
        ctx.globalCompositeOperation = 'source-over';
      }
      var lastCol = null;
      for (i = 0; i < sch.length; i++) {
        if (!sch[i]) continue;
        var cs = fg[sm[i]][lv(i)]; if (cs !== lastCol) { ctx.fillStyle = cs; lastCol = cs; }
        ctx.fillText(CHS[sch[i]] || String.fromCharCode(sch[i]), (i % C) * cw, ((i / C) | 0) * chh + oy);
      }

      // fire: a small heat grid, hottest at the logs, cooling and wandering as it rises
      if (!still) { fireAcc += dt; while (fireAcc > 1 / 13) { tickFire(fireOn); fireAcc -= 1 / 13; } }
      var fx0 = fireX - ((FW - 1) >> 1), fy0 = gy - 1 - FH;
      for (y = 0; y < FH; y++) for (x = 0; x < FW; x++) {
        var hv = heat[y][x]; if (!hv) continue;
        ctx.fillStyle = FCOL[hv]; var fc = FCH[hv]; if (hv === 7 || hv === 8) fc = ((x + y + ((t * 6) | 0)) & 1) ? '(' : ')';
        cell(fc, fx0 + x, fy0 + y);
      }
      // sparks, with a burst when the fire catches
      if (!still) {
        if (prevFire < 0.25 && fireOn >= 0.25) for (i = 0; i < 26; i++) sparks.push({ x: fireX + (Math.random() - 0.5) * 6, y: gy - 3, vx: (Math.random() - 0.5) * 9, vy: -(5 + Math.random() * 11), life: 0.8 + Math.random() * 1.4, max: 2.2 });
        if (Math.random() < fireOn * dt * 9) sparks.push({ x: fireX + (Math.random() - 0.5) * 4, y: gy - 4 - Math.random() * 3, vx: (Math.random() - 0.5) * 3, vy: -(3 + Math.random() * 6), life: 1 + Math.random() * 1.6, max: 2.6 });
        prevFire = fireOn;
      }
      for (i = sparks.length - 1; i >= 0; i--) {
        var sp = sparks[i]; sp.life -= dt; sp.x += (sp.vx + Math.sin(t * 2 + i) * 1.5) * dt; sp.y += sp.vy * dt; sp.vy += 1.2 * dt;
        if (sp.life <= 0 || sp.y < 0) { sparks.splice(i, 1); continue; }
        var lf = sp.life / sp.max; ctx.globalAlpha = clamp01(lf * 2.2); ctx.fillStyle = lf > 0.5 ? 'rgb(255,214,120)' : 'rgb(255,128,48)';
        cell(lf > 0.6 ? '*' : lf > 0.3 ? "'" : '.', Math.round(sp.x), Math.round(sp.y));
      }
      // steam off the mug
      ctx.globalAlpha = 0.75; ctx.fillStyle = fg[CAMP][0];
      var st = ((t * 1.6) | 0) % 2; cell(st ? ')' : '(', seatX + 3, gy - 3); cell(st ? '(' : ')', seatX + 4, gy - 4);

      // falling leaves: they sway, land, rest a while, then start again from the top
      var wind = Math.sin(t * 0.31) * 1.6 + Math.sin(t * 0.83 + 2) * 0.7, LC = [',', "'", '~', '*', '`', ','];
      ctx.globalAlpha = 0.95;
      for (i = 0; i < leaves.length; i++) {
        var lf2 = leaves[i];
        if (!still) {
          if (lf2.rest > 0) { lf2.rest -= dt; if (lf2.rest <= 0) { lf2.y = -1 - Math.random() * 6; lf2.x = Math.random() * C; } }
          else { lf2.y += lf2.vy * dt; lf2.x += (wind + Math.cos(t * lf2.sp + lf2.ph) * lf2.amp) * dt; if (lf2.x < -1) lf2.x += C + 2; if (lf2.x > C + 1) lf2.x -= C + 2; if (lf2.y >= lf2.land) { lf2.y = lf2.land; lf2.rest = 2 + Math.random() * 5; } }
        }
        var lx = Math.round(lf2.x), ly = Math.round(lf2.y); if (lx < 0 || lx >= C || ly < 0 || ly >= R) continue;
        ctx.fillStyle = fg[lf2.m][lv(ly * C + lx)];
        cell(lf2.rest > 0 ? '*' : LC[((t * 2.2 + lf2.ph * 3) | 0) % LC.length], lx, ly);
      }
      // fireflies near the trees once it is dark
      var flyA = step(0.62, 0.86, p);
      if (flyA > 0.02) {
        ctx.fillStyle = 'rgb(214,255,150)';
        for (i = 0; i < flies.length; i++) {
          var fl = flies[i]; a = Math.pow(Math.max(0, Math.sin(t * fl.sp + fl.ph)), 2) * flyA; if (a < 0.05) continue;
          var X2 = Math.round(fl.x + Math.sin(t * 0.37 + fl.ph) * 4), Y2 = Math.round(fl.y + Math.cos(t * 0.53 + fl.ph * 2) * 1.6);
          if (Math.abs(X2 - fireX) < FW) continue;
          ctx.globalAlpha = a; cell(a > 0.7 ? '*' : '.', X2, Y2);
        }
      }
      // every few frames a handful of maple leaves change character, so the canopies seem to stir
      if (!still && canopy.length) for (i = 0; i < 5; i++) { var ci = canopy[(Math.random() * canopy.length) | 0]; sch[ci] = '@&%#oO*'.charCodeAt((Math.random() * 7) | 0); }
      ctx.globalAlpha = 1;

      // clock
      var mins = Math.round(1000 + p * 335), ck = '[ ' + ((mins / 60) | 0) + ':' + ('0' + (mins % 60)).slice(-2) + ' ]';
      if (ck !== lastClock && clockEl) { lastClock = ck; clockEl.textContent = ck; phaseEl.textContent = p < 0.5 ? 'golden hour' : p < 0.8 ? 'dusk' : 'night' /* same beats as the captions */; }
    }

    function captions(p) {
      caps.forEach(function (el) {
        var from = +el.dataset.from, to = +el.dataset.to, o = Math.min(step(from - 0.04, from, p), 1 - step(to, to + 0.04, p));
        el.style.opacity = o; el.style.transform = 'translateY(' + ((1 - o) * 24) + 'px)'; el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      });
    }

    var target = 0, cur = 0, last = 0, lastDraw = 0, running = false, clock = 0;
    function readScroll() { var r = track.getBoundingClientRect(); target = clamp01((pinTop - r.top) / (r.height - pin.offsetHeight)); }
    function stillFrame() { for (var i = 0; i < 40; i++) tickFire(1); draw(0.9, 4.2, 0); }
    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      readScroll(); cur += (target - cur) * Math.min(1, dt * 5);
      if (now - lastDraw > 38) { var ddt = Math.min(0.1, (now - lastDraw) / 1000); lastDraw = now; clock += ddt; draw(cur, clock, ddt); captions(cur); }
      requestAnimationFrame(frame);
    }

    resize();
    var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { resize(); if (still) stillFrame(); }, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { resize(); if (still) stillFrame(); });
    if (still) { stillFrame(); return; }
    readScroll(); cur = target;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting && !running) { running = true; last = lastDraw = performance.now(); requestAnimationFrame(frame); }
        else if (!es[0].isIntersecting) running = false;
      }).observe(track);
    } else { running = true; last = lastDraw = performance.now(); requestAnimationFrame(frame); }
  })();

  /* =====================================================================================
     2. Page effects
     ===================================================================================== */
  var io = 'IntersectionObserver' in window;
  function onceVisible(el, fn, margin) {
    if (!io) { fn(); return; }
    var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); fn(); } }, { rootMargin: margin || '0px 0px -12% 0px' });
    o.observe(el);
  }
  function whileVisible(el, tick, ms) { // run tick on an interval only while el is on screen
    if (reduced || embedded) return;
    var id = null, start = function () { if (!id) id = setInterval(tick, ms); }, stop = function () { clearInterval(id); id = null; };
    if (!io) { start(); return; }
    new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }).observe(el);
  }

  // Reveal
  [].forEach.call(document.querySelectorAll('.reveal'), function (el) { onceVisible(el, function () { el.classList.add('is-in'); }); });

  // Decode: a heading resolves out of random ASCII, left to right. The real text stays in an sr-only span.
  var NOISE = '/\\|_-.*\'^~+=:;';
  [].forEach.call(document.querySelectorAll('[data-decode]'), function (el) {
    if (still) return;
    var final = el.textContent, sr = document.createElement('span'), vis = document.createElement('span');
    sr.className = 'sr-only'; sr.textContent = final; vis.setAttribute('aria-hidden', 'true'); vis.textContent = final;
    el.textContent = ''; el.appendChild(sr); el.appendChild(vis);
    onceVisible(el, function () {
      var t0 = performance.now(), dur = 500 + final.length * 22;
      (function tick(now) {
        var k = (now - t0) / dur, out = '';
        for (var i = 0; i < final.length; i++) out += final[i] === ' ' || i / final.length < k ? final[i] : NOISE[(Math.random() * NOISE.length) | 0];
        vis.textContent = out;
        if (k < 1) requestAnimationFrame(tick); else vis.textContent = final;
      })(t0);
    });
  });

  // Camp log: types itself, one line after another, the first time it is seen
  (function () {
    var list = document.querySelector('.term__lines'); if (!list || still) return;
    var lines = [].map.call(list.children, function (li) {
      var body = li.lastChild, textNode = body.nodeType === 3 ? body : null; if (!textNode) return null;
      var full = textNode.textContent.trim(), wrap = document.createElement('span'), shown = document.createElement('span'), rest = document.createElement('span');
      shown.className = 'typed'; rest.className = 'is-ghost'; rest.textContent = full; wrap.appendChild(shown); wrap.appendChild(rest); li.replaceChild(wrap, textNode);
      li.firstElementChild.classList.add('is-ghost');
      return { li: li, full: full, shown: shown, rest: rest };
    }).filter(Boolean);
    list.setAttribute('aria-label', 'Camp log');
    onceVisible(list, function () {
      var n = 0, c = 0;
      (function type() {
        var ln = lines[n]; if (!ln) return;
        if (c === 0) { ln.li.firstElementChild.classList.remove('is-ghost'); ln.li.classList.add('is-typing'); }
        c += 1; ln.shown.textContent = ln.full.slice(0, c); ln.rest.textContent = ln.full.slice(c);
        if (c >= ln.full.length) { if (n < lines.length - 1) ln.li.classList.remove('is-typing'); n += 1; c = 0; setTimeout(type, 260); }
        else setTimeout(type, 12 + Math.random() * 20);
      })();
    }, '0px 0px -20% 0px');
  })();

  // ASCII icons: a few frames each, swapped slowly while on screen
  var FRAMES = {
    tent: [
      String.raw`     /\   z
    /  \
   / /\ \
  / /  \ \
 /_/____\_\ `,
      String.raw`     /\    Z
    /  \  z
   / /\ \
  / /  \ \
 /_/____\_\ `,
      String.raw`     /\     z
    /  \   Z
   / /\ \ z
  / /  \ \
 /_/____\_\ `],
    fire: [
      String.raw`    )
   ) \
  ( ( )
  )\|/(
 (=====)`,
      String.raw`   (
  / (
 ( ) )
  )\|/(
 (=====)`,
      String.raw`    '
   ( )
  ) ( (
  (\|/)
 (=====)`],
    mug: [
      String.raw`   ) )
  ( (
 .-----.
 |     |]
 '-----'`,
      String.raw`  ( (
   ) )
 .-----.
 |     |]
 '-----'`,
      String.raw`   ( )
  ) (
 .-----.
 |     |]
 '-----'`],
    stars: [
      String.raw` .   *    .
    .   +
 *     .   .
   .  *   +
 +   .    *`,
      String.raw` *   .    +
    +   .
 .     *   .
   *  .   .
 .   +    .`,
      String.raw` .   +    .
    .   *
 +     .   *
   .  .   +
 *   .    .`],
    bigfire: [
      String.raw`       )
      ) \
     / ) (
    ( ( ) )
   ) ) ( ( \
   ( \\|// )
  o(=======)o`,
      String.raw`      (
     / (
    ( ) \
   ) ( ( )
   ( ) ) ( /
   ) \\|// (
  o(=======)o`,
      String.raw`       '
      ( )
     ) ( )
    ( ) ( (
   / ( ) ) )
   ( \\|// )
  o(=======)o`]
  };
  [].forEach.call(document.querySelectorAll('[data-anim]'), function (el, idx) {
    var frames = FRAMES[el.getAttribute('data-anim')]; if (!frames) return;
    var n = 0; whileVisible(el, function () { n = (n + 1) % frames.length; el.textContent = frames[n]; }, el.getAttribute('data-anim').indexOf('fire') > -1 ? 190 : 520 + idx * 40);
  });

  // Equaliser and "now playing"
  (function () {
    var eq = document.getElementById('eq'), now = document.getElementById('now'); if (!eq) return;
    var BARS = 20, ROWS = 5, t = 0;
    whileVisible(eq, function () {
      t += 0.14; var out = '';
      for (var r = ROWS; r >= 1; r--) {
        for (var i = 0; i < BARS; i++) {
          var h = 1 + Math.round((ROWS - 1) * (0.5 + 0.5 * Math.sin(t * 2.1 + i * 0.9)) * (0.55 + 0.45 * Math.sin(t * 1.3 + i * 2.7)));
          out += (h >= r ? '#' : ' ') + (i < BARS - 1 ? ' ' : '');
        }
        out += '\n';
      }
      eq.textContent = out + new Array(BARS * 2).join('-');
    }, 120);
    var tracks = [].slice.call(document.querySelectorAll('.deck__tracks li')), cur = 0;
    if (now && tracks.length) whileVisible(eq, function () {
      tracks[cur].classList.remove('is-on'); cur = (cur + 1) % tracks.length; tracks[cur].classList.add('is-on');
      now.textContent = tracks[cur].children[1].textContent;
    }, 6000);
  })();
})();
