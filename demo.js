/* ===== O.C.E.A.N demo ===== */
var $ = function (x) { return document.getElementById(x); };
var NS = 'http://www.w3.org/2000/svg';
var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

var STAGES = [
  { id: 'intro', ic: 'description', lbl: 'Case Brief', nav: 'Intro', title: 'Arabian Sea, 14 Aug 2026', blurb: 'A satellite pass detects a dark slick. No vessel reported a spill.', hud: 'BRIEF', dur: 2200 },
  { id: 'detect', ic: 'visibility', lbl: 'Stage 01 \u2014 Detect', nav: 'Detect', title: 'Sentinel-1 finds the slick', blurb: 'Radar imagery is segmented. The classifier confirms mineral oil \u2014 not algae, rain, or a wind-calm patch.', hud: 'SAR SCAN', dur: 3200 },
  { id: 'hindcast', ic: 'history', lbl: 'Stage 02 \u2014 Rewind', nav: 'Hindcast', title: 'Reversing the currents', blurb: 'O.C.E.A.N simulates the slick backward through 36 hours of ocean drift to find where the oil first entered the water.', hud: 'HINDCAST', dur: 3200 },
  { id: 'correlate', ic: 'share_location', lbl: 'Stage 03 \u2014 Cross-check', nav: 'Correlate', title: 'Who was there, and when', blurb: 'AIS records are pulled for every vessel near the estimated origin at the estimated dump time.', hud: 'AIS QUERY', dur: 3000 },
  { id: 'rank', ic: 'leaderboard', lbl: 'Stage 04 \u2014 Rank', nav: 'Rank', title: 'Scoring the suspects', blurb: 'Each vessel receives a Vessel Suspicion Index. The list is sorted. The lead suspect emerges.', hud: 'SCORING', dur: 3000 },
  { id: 'verdict', ic: 'gavel', lbl: 'Case File', nav: 'Verdict', title: 'M/T STENA NORDIC', blurb: 'A ranked case file is handed to coast-guard enforcement with the evidence trail behind the score.', hud: 'CASE FILE', dur: 4500 }
];
var CAPTIONS = {
  intro: 'Raw satellite pass. The dark patch, lower-right, is the anomaly awaiting classification.',
  detect: 'AI segmentation isolates the slick and rules out natural look-alikes. Oil confirmed.',
  hindcast: 'The slick is traced backward through 36 hours of ocean drift to its estimated origin.',
  correlate: 'AIS records reveal every vessel that was near the origin at the estimated dump time.',
  rank: 'Each vessel is scored on the Vessel Suspicion Index. The tanker leads by a wide margin.',
  verdict: 'O.C.E.A.N names M/T STENA NORDIC as the lead suspect. The case file is handed to enforcement.'
};
var VESSELS = [
  { name: 'M/T STENA NORDIC', imo: '9332237', type: 'Crude oil tanker', dist: 4.2, score: 87, slowed: true, dark: true, culprit: true, track: 'M157 155L193 175L219 195L245 209L279 229' },
  { name: 'MV PACIFIC DAWN', imo: '9447210', type: 'Container ship', dist: 19.8, score: 28, slowed: false, dark: false, culprit: false, track: 'M250 60L290 80L330 102L380 125' },
  { name: 'MV OCEAN TRADER', imo: '9558731', type: 'Bulk carrier', dist: 56.1, score: 34, slowed: false, dark: true, culprit: false, track: 'M520 420L550 385L575 355L593 333' },
  { name: 'MV COASTAL STAR', imo: '9601452', type: 'Product tanker', dist: 76.3, score: 41, slowed: true, dark: false, culprit: false, track: 'M610 170L640 185L665 197L680 205' },
  { name: 'FV HARBOUR LIGHT', imo: '9012345', type: 'Fishing vessel', dist: 34.5, score: 12, slowed: false, dark: false, culprit: false, track: 'M90 340L115 320L130 308L148 299' }
];

var si = 0, playing = false, prog = 0, last = 0, speed = 1, n = 0, timers = [];

/* ---------- helpers ---------- */
function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
function clearTimers() { timers.forEach(clearTimeout); timers = []; }
function st() { return 'style="--n:' + (n++) + '"'; }
function ll(t, m, c) { return '<div class="log-line" ' + st() + '><span class="log-time">' + t + '</span><span class="log-msg ' + (c || '') + '">' + m + '</span></div>'; }
function countUp(el) {
  var end = +el.dataset.count, dec = +(el.dataset.dec || 0), pre = el.dataset.pre || '', suf = el.dataset.suf || '', dur = +(el.dataset.dur || 1100), t0 = performance.now() + (+el.dataset.delay || 0);
  (function f(now) {
    var p = Math.min(Math.max((now - t0) / dur, 0), 1), e = 1 - Math.pow(1 - p, 3);
    el.textContent = pre + (end * (reduced ? 1 : e)).toFixed(dec) + suf;
    if (p < 1) requestAnimationFrame(f);
  })(performance.now());
}

/* ---------- water background ---------- */
(function () {
  var c = $('water'), x = c.getContext('2d'), W, H, R = 170, rip = [], lt = 0;
  var m = { x: -999, y: -999, tx: -999, ty: -999, k: 0, on: 0 };
  function rs() { W = c.width = innerWidth; H = c.height = innerHeight; }
  rs(); addEventListener('resize', rs);
  addEventListener('mousemove', function (e) {
    m.tx = e.clientX; m.ty = e.clientY; m.on = 1;
    if (e.timeStamp - lt > 140) { rip.push({ x: e.clientX, y: e.clientY, r: 4, l: 1 }); lt = e.timeStamp; }
  });
  document.addEventListener('mouseleave', function () { m.on = 0; });
  function w(px, py, t) {
    var dx = px - m.x, dy = py - m.y, d = Math.hypot(dx, dy) || 1;
    if (d >= R || m.k < .01) return [px, py];
    var q = Math.pow(1 - d / R, 2) * m.k, a = Math.sin(d * .075 - t * 3.2) * 11 * q;
    return [px + dx / d * a, py + dy / d * a];
  }
  (function f(ts) {
    var t = ts / 1000, i, j, p;
    if (m.x === -999) { m.x = m.tx; m.y = m.ty; }
    m.x += (m.tx - m.x) * .14; m.y += (m.ty - m.y) * .14; m.k += ((m.on ? 1 : 0) - m.k) * .06;
    x.clearRect(0, 0, W, H); x.lineWidth = 1; x.strokeStyle = 'rgba(226,224,216,.7)'; x.beginPath();
    for (i = 0; i <= W + 40; i += 40) for (j = 0; j <= H + 8; j += 8) { p = w(i, j, t); j ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }
    for (j = 0; j <= H + 40; j += 40) for (i = 0; i <= W + 8; i += 8) { p = w(i, j, t); i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }
    x.stroke();
    if (m.k > .01 && !reduced) {
      var g = x.createRadialGradient(m.x, m.y, 0, m.x, m.y, R);
      g.addColorStop(0, 'rgba(13,148,136,' + .14 * m.k + ')'); g.addColorStop(.6, 'rgba(2,132,199,' + .06 * m.k + ')'); g.addColorStop(1, 'rgba(2,132,199,0)');
      x.fillStyle = g; x.beginPath(); x.arc(m.x, m.y, R, 0, 6.3); x.fill();
    }
    for (i = rip.length - 1; i >= 0; i--) {
      var r = rip[i]; r.r += 2.2; r.l -= .014;
      if (r.l <= 0 || r.r > R) { rip.splice(i, 1); continue; }
      x.beginPath(); x.arc(r.x, r.y, r.r, 0, 6.3); x.strokeStyle = 'rgba(13,148,136,' + .35 * r.l + ')'; x.stroke();
    }
    requestAnimationFrame(f);
  })(0);
})();

/* ---------- map objects ---------- */
var particles = [], shipEls = [], trackEls = [], hcStart = 0, shipStart = 0, prevIdx = 0;
(function buildMap() {
  var pg = $('particles'), i, c;
  for (i = 0; i < 70; i++) {
    c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 1.8 + Math.random() * 1.2); pg.appendChild(c);
    var a = Math.random() * 6.28, rr = Math.sqrt(Math.random());
    particles.push({ el: c, sx: 473 + Math.cos(a) * rr * 42, sy: 239 + Math.sin(a) * rr * 27, ex: 267 + (Math.random() - .5) * 26, ey: 349 + (Math.random() - .5) * 18, d: Math.random() * .35, ph: Math.random() * 6 });
  }
  VESSELS.forEach(function (v, k) {
    var p = document.createElementNS(NS, 'path'); p.setAttribute('d', v.track); if (v.culprit) p.setAttribute('class', 'cul'); $('tracks').appendChild(p); trackEls.push(p);
    var g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'ship' + (v.culprit ? ' cul' : '')); g.dataset.i = k;
    g.innerHTML = '<circle class="ring" r="15"/><circle r="18" fill="transparent"/><path class="hull" d="M0-7L5 6L0 3.5L-5 6Z"/><g class="sv" data-min="4"><text class="sc" x="12" y="-4">' + v.score + '</text><text class="nm" x="12" y="7">' + v.name.split(' ').pop() + '</text></g>';
    $('ships').appendChild(g); shipEls.push(g);
    g.addEventListener('mouseenter', function () { hl(k, true); });
    g.addEventListener('mousemove', function (e) { tip(e, k); });
    g.addEventListener('mouseleave', function () { hl(k, false); $('tip').classList.remove('on'); });
  });
  trackEls[0].classList.add('cul');
})();

function hl(k, on) {
  shipEls[k].classList.toggle('hl', on);
  var rc = $('rc-' + k); if (rc) rc.classList.toggle('hl', on);
}
function tip(e, k) {
  var v = VESSELS[k], t = $('tip'), r = $('mapWrap').getBoundingClientRect();
  t.innerHTML = '<b>' + v.name + '</b><br>' + v.type + ' \u00B7 ' + v.dist + ' km' + (si >= 4 ? '<br>VSI <b>' + v.score + '</b>' : '');
  t.style.left = Math.min(e.clientX - r.left + 14, r.width - 190) + 'px'; t.style.top = (e.clientY - r.top + 14) + 'px'; t.classList.add('on');
}
$('mapWrap').addEventListener('mousemove', function (e) {
  var r = this.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
  $('coords').textContent = (17.42 - py * .24).toFixed(3) + '\u00B0N \u00B7 ' + (73.02 + px * .39).toFixed(3) + '\u00B0E';
});

/* map animation loop: particles + moving vessels */
function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
(function loop(ts) {
  var i;
  if (si >= 2) {
    var hp = si === 2 ? Math.min((ts - hcStart) / 3200, 1) : 1;
    particles.forEach(function (p) {
      var e = ease(Math.min(Math.max((hp - p.d) / (1 - p.d), 0), 1)), wob = (1 - e) * Math.sin(ts / 400 + p.ph) * 3;
      p.el.setAttribute('cx', p.sx + (p.ex - p.sx) * e + wob); p.el.setAttribute('cy', p.sy + (p.ey - p.sy) * e + wob);
    });
  }
  if (si >= 3) {
    var t = reduced ? 1 : Math.min((ts - shipStart) / 3000, 1), e = 1 - Math.pow(1 - t, 3);
    shipEls.forEach(function (g, k) {
      var P = trackEls[k], L = P.getTotalLength(), l = L * e, a = P.getPointAtLength(Math.max(l - 4, 0)), b = P.getPointAtLength(Math.min(l + 4, L)), p = P.getPointAtLength(l);
      g.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ')');
      g.querySelector('.hull').setAttribute('transform', 'rotate(' + (Math.atan2(b.y - a.y, b.x - a.x) * 57.3 + 90) + ')');
    });
  }
  requestAnimationFrame(loop);
})(0);

/* ---------- UI build ---------- */
function buildTL() {
  var tr = $('tlTrack'); tr.innerHTML = '';
  STAGES.forEach(function (s, i) {
    var b = document.createElement('button'); b.className = 'tl-seg';
    b.innerHTML = '<div class="tl-bar ' + (i < si ? 'done' : i === si ? 'act' : '') + '">' + (i === si ? '<div class="tl-prog" id="tlp" style="width:' + prog * 100 + '%"></div>' : '') + '</div><span class="tl-name ' + (i === si ? 'act' : '') + '">' + s.nav + '</span>';
    b.onclick = function () { doJump(i); }; tr.appendChild(b);
  });
}
function buildQN() {
  var nav = $('quickNav'); nav.innerHTML = '';
  STAGES.forEach(function (s, i) {
    var b = document.createElement('button'); b.className = 'qn' + (i === si ? ' act' : '');
    b.innerHTML = '<span class="material-symbols-outlined">' + s.ic + '</span><span><small>' + String(i + 1).padStart(2, '0') + '</small><span class="l">' + s.nav + '</span></span>';
    b.onclick = function () { doJump(i); }; nav.appendChild(b);
  });
}

function render() {
  var s = STAGES[si], now = performance.now();
  clearTimers();
  if (si === 2 && prevIdx !== 2) hcStart = now;
  if (si >= 3 && prevIdx < 3) shipStart = now;
  if (si < 3) shipStart = now;
  prevIdx = si;

  ['caseTitle', 'caseBlurb'].forEach(function (id) { $(id).classList.add('swap'); });
  later(function () { $('caseTitle').textContent = s.title; $('caseBlurb').textContent = s.blurb; $('caseTitle').classList.remove('swap'); $('caseBlurb').classList.remove('swap'); }, 220);
  $('stageLbl').textContent = s.lbl; $('stageTitle').textContent = s.title; $('stageIc').textContent = s.ic;
  $('stageIc').parentNode.classList.remove('flip'); void $('stageIc').offsetWidth; $('stageIc').parentNode.classList.add('flip');
  $('verdictBadge').style.display = s.id === 'verdict' ? 'flex' : 'none';
  $('mapHudR').textContent = s.hud; $('captionTxt').textContent = CAPTIONS[s.id];
  $('slickLbl').textContent = si === 0 ? 'UNCLASSIFIED ANOMALY' : 'OIL SLICK \u00B7 11.2 km\u00B2';
  $('scanLine').style.display = si === 1 ? 'block' : 'none';
  document.querySelectorAll('#map .sv').forEach(function (e) {
    var mn = +(e.dataset.min || 0), mx = +(e.dataset.max || 99); e.classList.toggle('on', si >= mn && si <= mx);
  });
  shipEls[0].classList.toggle('pulse', si === 5);
  renderAI(); updateCtrl(); buildTL();
  document.querySelectorAll('.qn').forEach(function (b, i) { b.classList.toggle('act', i === si); });
  document.querySelectorAll('[data-count]').forEach(countUp);
}

function renderAI() {
  var body = $('aiBody'), id = STAGES[si].id, h = '';
  n = 0; body.scrollTop = 0;
  if (id === 'intro') {
    h = ll('03:12Z', 'Sentinel-1 IW pass received &middot; Arabian Sea tile S1A_20260814') +
      ll('03:14Z', 'Dark surface anomaly detected &mdash; 11.2 km&sup2; patch, 38 km offshore', 'warn') +
      ll('03:14Z', 'No vessel has reported a spill in this area. Flagging for attribution.');
  } else if (id === 'detect') {
    var cks = [['Algae bloom', 0], ['Rain cell / wind shadow', 0], ['Low-wind calm patch', 0], ['Natural seep', 0], ['Mineral oil &mdash; crude', 1]];
    h = ll('03:15Z', 'Segmentation model (U-Net) processing radar tile&hellip;') + '<div class="check-list">' +
      cks.map(function (c) {
        return '<div class="check-item ' + (c[1] ? 'm' : '') + '" ' + st() + '><span>' + c[0] + '</span><span class="r"><span class="material-symbols-outlined" style="font-size:15px">' + (c[1] ? 'check_circle' : 'cancel') + '</span>' + (c[1] ? 'Match' : 'Ruled out') + '</span></div>';
      }).join('') + '</div>' +
      ll('03:19Z', 'Classification: <span data-count="94.2" data-dec="1" data-suf="%" data-delay="1500">0%</span> confidence &mdash; mineral oil discharge', 'good') +
      ll('03:19Z', 'Spill confirmed. Initiating hindcast sequence.');
  } else if (id === 'hindcast') {
    h = ll('03:20Z', 'Loading CMEMS surface-current fields (72h window)&hellip;') + ll('03:20Z', 'Loading ERA5 wind forcing&hellip;') +
      ll('03:21Z', 'Running Lagrangian particle backtrack &middot; 8,000 particles') +
      '<div class="prog-block" ' + st() + '><div class="pb-hdr"><span class="mono-label">Rewinding</span><span class="pb-val" data-count="36" data-pre="&minus;" data-suf="h" data-dur="3200" data-delay="600">&minus;0h</span></div><div class="pb-track"><div class="pb-fill" id="hFill"></div></div><p class="pb-note">Particles tracked backward through current + wind drift to estimate the point and time of discharge.</p></div>' +
      ll('03:24Z', 'Estimated origin: 17.38&deg;N, 73.09&deg;E &middot; 13 Aug 14:20Z (&plusmn;2.1 km, &plusmn;40 min)', 'good');
    later(function () { var f = $('hFill'); if (f) f.style.width = '100%'; }, 700);
  } else if (id === 'correlate') {
    h = ll('03:25Z', 'Querying AIS archive within 25 km of origin, 13 Aug 13:00&ndash;16:00Z&hellip;') +
      ll('03:26Z', '5 vessels returned in spatial-temporal window', 'good') + '<div style="margin:10px 0">' +
      VESSELS.map(function (v, k) {
        return '<div class="vessel-item" data-v="' + k + '" ' + st() + '><span class="material-symbols-outlined" style="color:var(--meta)">directions_boat</span><span class="nm">' + v.name + '</span><span class="ds">' + v.dist + ' km</span></div>';
      }).join('') + '</div>' + ll('03:27Z', 'Beginning Vessel Suspicion Index scoring&hellip;');
  } else if (id === 'rank') {
    var sorted = VESSELS.map(function (v, k) { return k; }).sort(function (a, b) { return VESSELS[b].score - VESSELS[a].score; });
    h = ll('03:28Z', 'Computing VSI for 5 candidates&hellip;') + '<div class="rank-stack" id="stack" style="height:' + VESSELS.length * 76 + 'px">' +
      VESSELS.map(function (v, k) {
        var cls = v.score >= 70 ? 'hi' : v.score >= 40 ? 'mid' : '';
        return '<div class="rank-card ' + (v.culprit ? 'top' : '') + '" id="rc-' + k + '" data-v="' + k + '" style="transform:translateY(' + k * 76 + 'px)">' +
          '<div class="rc-hdr"><span><span class="rn" id="rn-' + k + '">#' + (k + 1) + '</span><b>' + v.name + '</b></span><span class="score ' + cls + '" data-count="' + v.score + '" data-dur="1400">0</span></div>' +
          '<div class="rc-bar"><i data-w="' + v.score + '"></i></div>' +
          '<div class="rc-f"><span>' + v.dist + ' km</span><span class="' + (v.slowed ? 'on' : '') + '">' + (v.slowed ? '&#9673;' : '&#9675;') + ' slowed</span><span class="' + (v.dark ? 'on' : '') + '">' + (v.dark ? '&#9673;' : '&#9675;') + ' AIS dark</span><span>' + v.type + '</span></div></div>';
      }).join('') + '</div>';
    later(function () { document.querySelectorAll('.rc-bar i').forEach(function (i) { i.style.width = i.dataset.w + '%'; }); }, 80);
    later(function () { sorted.forEach(function (k, r) { var c = $('rc-' + k); if (c) { c.style.transform = 'translateY(' + r * 76 + 'px)'; $('rn-' + k).textContent = '#' + (r + 1); } }); }, 1500);
  } else {
    var c = VESSELS[0];
    h = '<div class="v-alert" ' + st() + '><span class="material-symbols-outlined">warning</span>Case file generated</div>' +
      '<div class="v-card" ' + st() + '><span class="stamp">LEAD SUSPECT</span><div class="mono-label orange">Lead suspect</div><div class="v-name">' + c.name + '</div><div class="v-imo">IMO ' + c.imo + ' &middot; ' + c.type + '</div>' +
      '<div class="ev">' + [['Distance to spill origin', c.dist + ' km'], ['Speed anomaly', 'Slowed 7.2 &rarr; 1.4 kn'], ['AIS status', 'Dark 13:48&ndash;14:35Z'], ['Vessel type risk', 'High (crude tanker)']].map(function (r) {
        return '<div class="ev-row" ' + st() + '><span>' + r[0] + '</span><span><i></i>' + r[1] + '</span></div>';
      }).join('') + '</div><div class="vsi"><span class="mono-label">Vessel Suspicion Index</span><b><span data-count="' + c.score + '" data-dur="1600" data-delay="500">0</span>/100</b></div></div>' +
      '<div class="enf" ' + st() + '><span class="material-symbols-outlined">info</span><span>Case file exported to Indian Coast Guard regional command. Recommend interdiction and vessel inspection at next port of call.</span></div>';
  }
  body.innerHTML = h;
}

/* hover link: list <-> map */
$('aiBody').addEventListener('mouseover', function (e) { var t = e.target.closest('[data-v]'); if (t) hl(+t.dataset.v, true); });
$('aiBody').addEventListener('mouseout', function (e) { var t = e.target.closest('[data-v]'); if (t) hl(+t.dataset.v, false); });

/* ---------- controls ---------- */
function updateCtrl() {
  var s = STAGES[si], btn = $('playBtn'), last_ = si === STAGES.length - 1, ic = function (x) { return '<span class="material-symbols-outlined">' + x + '</span>'; };
  if (last_) { btn.innerHTML = ic('restart_alt') + 'Replay case'; btn.onclick = doReset; }
  else if (playing) { btn.innerHTML = ic('pause') + 'Pause'; btn.onclick = doPause; }
  else { btn.innerHTML = ic('play_arrow') + (si === 0 && prog === 0 ? 'Start replay' : 'Resume'); btn.onclick = doPlay; }
  $('ctrlInfo').innerHTML = '<span>Step ' + (si + 1) + ' / ' + STAGES.length + '</span>' + ic('chevron_right') + '<span class="ci">' + s.lbl + '</span>';
}
function doPlay() { playing = true; last = performance.now(); requestAnimationFrame(tick); updateCtrl(); }
function doPause() { playing = false; updateCtrl(); }
function doReset() { playing = false; si = 0; prog = 0; render(); }
function doJump(i) { playing = false; si = i; prog = 0; render(); }
function tick(now) {
  if (!playing) return;
  prog += (now - last) * speed / STAGES[si].dur; last = now;
  if (prog >= 1) {
    if (si < STAGES.length - 1) { si++; prog = 0; render(); }
    else { playing = false; prog = 1; updateCtrl(); return; }
  }
  var p = $('tlp'); if (p) p.style.width = prog * 100 + '%';
  requestAnimationFrame(tick);
}
$('resetBtn').onclick = doReset;
$('speedBtn').onclick = function () { speed = speed === 1 ? 2 : speed === 2 ? .5 : 1; this.textContent = speed + '\u00D7'; };
document.addEventListener('keydown', function (e) {
  if (e.code === 'Space') { e.preventDefault(); playing ? doPause() : (si === STAGES.length - 1 ? doReset() : doPlay()); }
  else if (e.key === 'ArrowRight' && si < STAGES.length - 1) doJump(si + 1);
  else if (e.key === 'ArrowLeft' && si > 0) doJump(si - 1);
});

buildQN(); render();
