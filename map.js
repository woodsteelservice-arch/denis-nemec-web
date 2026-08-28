/* ═══════════════════════════════════════════
   Mapa pôsobnosti — interaktívny choropleth
   Dáta: map-data.js (geometria) + MARKETS (nižšie)
         + PROJECTS z main.js (firmy → trhy)
   ═══════════════════════════════════════════ */
(() => {
  const GEO = window.EUROPE_GEO;
  const svg = document.getElementById('mapSvg');
  if (!GEO || !svg) return;

  const NS = 'http://www.w3.org/2000/svg';
  const PROJECTS = window.PROJECTS || [];

  /* ── trhy: kategórie a kontext ─────────────
     tier 3 = domáci trh, 2 = aktívny trh, 1 = rozvíjaný trh
     Metriky `firms` a `sectors` sa dopočítavajú z PROJECTS.markets. */
  const MARKETS = {
    SVK: { tier: 3, since: 2018, flag: '🇸🇰', desc: 'Domovský trh skupiny. Sídlo, výroba aj kompletné riadenie — pôsobia tu všetky firmy portfólia.' },
    DEU: { tier: 2, since: 2021, flag: '🇩🇪', desc: 'Kľúčový exportný trh. Stavebné subdodávky a personálne služby pre nemeckých generálnych dodávateľov.' },
    AUT: { tier: 2, since: 2023, flag: '🇦🇹', desc: 'Blízky trh s vysokou kúpnou silou. Prioritný smer expanzie výroby exteriérových konštrukcií.' },
    CZE: { tier: 2, since: 2022, flag: '🇨🇿', desc: 'Rozšírenie energetických a realitných aktivít pri minimálnej jazykovej a legislatívnej bariére.' },
    POL: { tier: 1, since: 2026, flag: '🇵🇱', desc: 'Trh v analýze. Veľký objem dopytu, pripravuje sa vstup výrobnej divízie.' },
    HRV: { tier: 1, since: 2024, flag: '🇭🇷', desc: 'Sezónny trh naviazaný na turizmus a rezidenčné projekty pri pobreží.' }
  };

  const TIERS = {
    3: { key: 3, label: 'Domáci trh',    color: '#9e8b64', fill: '#5c5340', desc: 'Sídlo, výroba a riadenie' },
    2: { key: 2, label: 'Aktívny trh',   color: '#9e8b64', fill: '#5c5340', desc: 'Bežiace zákazky a partneri' },
    1: { key: 1, label: 'Rozvíjaný trh', color: '#9e8b64', fill: '#5c5340', desc: 'Vstup v príprave' }
  };

  /* ── odvodenie metrík z PROJECTS ─────────── */
  Object.entries(MARKETS).forEach(([iso, m]) => {
    m.iso = iso;
    m.name = (GEO.countries[iso] || {}).sk || iso;
    m.firms = PROJECTS.filter(p => (p.markets || []).includes(iso));
    m.sectors = [...new Set(m.firms.map(p => p.sector))];
  });

  const YEAR = new Date().getFullYear();
  const maxFirms = Math.max(1, ...Object.values(MARKETS).map(m => m.firms.length));
  const maxYears = Math.max(1, ...Object.values(MARKETS).map(m => Math.max(0, YEAR - m.since)));
  Object.values(MARKETS).forEach(m => {
    m.years = Math.max(0, YEAR - m.since);
    // index 0–100: kategória (45) + zastúpenie firiem (35) + dĺžka pôsobenia (20)
    m.score = Math.round((m.tier / 3) * 45 + (m.firms.length / maxFirms) * 35 + (m.years / maxYears) * 20);
  });
  const ranked = Object.values(MARKETS).sort((a, b) => b.score - a.score);
  ranked.forEach((m, i) => { m.rank = i + 1; });

  /* ── stav ──────────────────────────────── */
  const view = document.getElementById('mapView');
  const tip = document.getElementById('mapTip');
  const panel = document.getElementById('mapPanel');
  const state = { selected: null, filter: null, hover: null };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── vykreslenie SVG ───────────────────── */
  const [, , FULLW, FULLH] = GEO.viewBox.split(' ').map(Number);
  /* domovský výrez sa dopočíta z trhov (HOME) — mapa štartuje nad strednou Európou */
  let HOME = { x: 0, y: 0, w: FULLW, h: FULLH };
  let VBW = FULLW, VBH = FULLH;
  svg.setAttribute('viewBox', GEO.viewBox);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');

  const allLand = Object.values(GEO.countries).map(c => c.d).join('');

  svg.innerHTML = `
    <defs>
      <linearGradient id="gT3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6b6149"/><stop offset="100%" stop-color="#4e4636"/>
      </linearGradient>
      <linearGradient id="gT2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6b6149"/><stop offset="100%" stop-color="#4e4636"/>
      </linearGradient>
      <linearGradient id="gT1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6b6149"/><stop offset="100%" stop-color="#4e4636"/>
      </linearGradient>
      <linearGradient id="gLand" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1c1f22"/><stop offset="100%" stop-color="#141619"/>
      </linearGradient>
    </defs>
    <rect class="m-ocean" x="0" y="0" width="${FULLW}" height="${FULLH}"/>
    <g id="mapZoom">
      <path class="m-grat" d="${GEO.graticule || ''}"/>
      <path class="m-coast" d="${allLand}"/>
      <g id="mapLands"></g>
      <g id="mapMarkets"></g>
      <g id="mapLabels"></g>
    </g>`;

  const gZoom = svg.querySelector('#mapZoom');
  const gLands = svg.querySelector('#mapLands');
  const gMarkets = svg.querySelector('#mapMarkets');
  const gLabels = svg.querySelector('#mapLabels');

  const nodes = {};      // iso -> path
  const labels = {};     // iso -> g

  Object.entries(GEO.countries).forEach(([iso, c]) => {
    const m = MARKETS[iso];
    if (!m) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', c.d);
      p.setAttribute('vector-effect', 'non-scaling-stroke');
      p.setAttribute('class', 'm-country');
      gLands.appendChild(p);
      nodes[iso] = p;
      return;
    }
    /* trh = dve vrstvy: výplň s gradientom + samostatný obrys (ostrý pri zoome) */
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', `m-market m-market--t${m.tier}`);
    g.dataset.iso = iso;
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', `${m.name} — ${TIERS[m.tier].label}`);

    const fill = document.createElementNS(NS, 'path');
    fill.setAttribute('d', c.d);
    fill.setAttribute('class', 'm-market__fill');
    fill.setAttribute('fill', `url(#gT${m.tier})`);

    const halo = document.createElementNS(NS, 'path');
    halo.setAttribute('d', c.d);
    halo.setAttribute('class', 'm-market__halo');
    halo.setAttribute('vector-effect', 'non-scaling-stroke');

    const line = document.createElementNS(NS, 'path');
    line.setAttribute('d', c.d);
    line.setAttribute('class', 'm-market__line');
    line.setAttribute('vector-effect', 'non-scaling-stroke');

    g.append(halo, fill, line);
    g.style.setProperty('--tint', TIERS[m.tier].color);
    gMarkets.appendChild(g);
    nodes[iso] = g;
  });

  /* popisky sedia v bode najvzdialenejšom od hraníc (pole of inaccessibility),
     takže text ostáva vnútri územia krajiny */
  const labelText = {};
  Object.entries(GEO.countries).forEach(([iso, c]) => {
    const m = MARKETS[iso];
    if (!m) return;                       // popisujeme výhradne trhy skupiny
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', `m-label m-label--market is-t${m.tier}`);
    const p = c.l || c.c;
    g.setAttribute('transform', `translate(${p[0]},${p[1]})`);
    const t = document.createElementNS(NS, 'text');
    t.textContent = m ? c.sk.toUpperCase() : c.sk;
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'middle');
    g.appendChild(t);
    gLabels.appendChild(g);
    labels[iso] = g;
    labelText[iso] = t;
  });

  /* ── umiestnenie popiskov ───────────────
     Text sa overuje geometricky: všetky body jeho obdĺžnika musia ležať
     vnútri polygónu krajiny. Ak nesedí, popisok sa posunie a v krajnom
     prípade zmenší. Všetky trhy dostanú nakoniec rovnakú veľkosť písma. */

  /* test "leží bod vo vnútri krajiny" robí priamo prehliadač nad SVG cestou —
     presnejšie a spoľahlivejšie než vlastný algoritmus */
  const hitPath = {};
  function fillPathOf(iso) {
    if (hitPath[iso]) return hitPath[iso];
    const p = nodes[iso] && nodes[iso].querySelector
      ? nodes[iso].querySelector('.m-market__fill')
      : nodes[iso];
    return (hitPath[iso] = p);
  }

  const svgPt = svg.createSVGPoint();
  function inCountry(iso, x, y) {
    const p = fillPathOf(iso);
    if (!p || !p.isPointInFill) return true;
    svgPt.x = x; svgPt.y = y;
    return p.isPointInFill(svgPt);
  }

  /* obdĺžnik textu sa testuje v hustej sieti bodov */
  function boxFits(iso, cx, cy, halfW, halfH) {
    const cols = 17, rows = 5;
    for (let i = 0; i < cols; i++) {
      const x = cx - halfW + (2 * halfW) * i / (cols - 1);
      for (let j = 0; j < rows; j++) {
        const y = cy - halfH + (2 * halfH) * j / (rows - 1);
        if (!inCountry(iso, x, y)) return false;
      }
    }
    return true;
  }

  /* nájde pozíciu pre text danej veľkosti; null = nezmestí sa nikam */
  function placeLabel(iso, halfW, halfH, m) {
    const c = GEO.countries[iso];
    const start = c.l || c.c;
    const ox = m ? m.dx : 0, oy = m ? m.dy : 0;   // stred textu voči kotve
    const fits = (x, y) => boxFits(iso, x + ox, y + oy, halfW, halfH);
    if (fits(start[0], start[1])) return start;
    const step = Math.max(halfH * 0.5, 0.7);
    for (let r = 1; r <= 22; r++) {
      for (let a = 0; a < 24; a++) {
        const ang = (a / 24) * Math.PI * 2;
        const x = start[0] + Math.cos(ang) * step * r * 1.8;   // radšej vodorovne
        const y = start[1] + Math.sin(ang) * step * r * 0.8;
        if (fits(x, y)) return [x, y];
      }
    }
    return null;
  }

  function baseFontSize() {
    const boxW = view.getBoundingClientRect().width || 1200;
    const pxPerUnit = boxW / VBW;              // koľko px má jedna jednotka mapy
    return Math.max(2, 13 / pxPerUnit);        // 13 px je pohodlne čitateľných
  }

  /* skutočné rozmery vykresleného textu prepočítané do súradníc mapy */
  function measure(t, p) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const inv = ctm.inverse();
    const r = t.getBoundingClientRect();
    if (!r.width) return null;
    const pt = svg.createSVGPoint();
    pt.x = r.left; pt.y = r.top;
    const a = pt.matrixTransform(inv);
    pt.x = r.right; pt.y = r.bottom;
    const b = pt.matrixTransform(inv);
    return {
      halfW: Math.abs(b.x - a.x) / 2,
      halfH: Math.abs(b.y - a.y) / 2,
      // odchýlka stredu textu od kotviaceho bodu (kvôli baseline)
      dx: (a.x + b.x) / 2 - p[0],
      dy: (a.y + b.y) / 2 - p[1]
    };
  }

  function fitLabels() {
    const isos = Object.keys(MARKETS);
    const anchors = {};
    isos.forEach(iso => {
      const g = labels[iso], c = GEO.countries[iso];
      if (g) g.setAttribute('transform', `translate(${(c.l || c.c)[0]},${(c.l || c.c)[1]})`);
      anchors[iso] = c.l || c.c;
    });

    // 1) najväčšia veľkosť písma, pri ktorej text ešte celý leží v území
    const best = {};
    isos.forEach(iso => {
      const t = labelText[iso];
      if (!t) return;
      const top = baseFontSize(), floor = top * 0.42, stp = top / 32;
      best[iso] = { fs: floor, pos: anchors[iso] };
      for (let fs = top; fs >= floor; fs -= stp) {
        t.style.fontSize = fs + 'px';
        const m = measure(t, anchors[iso]);
        if (!m) continue;
        const pad = m.halfH * 0.35;                       // odstup od hranice
        const pos = placeLabel(iso, m.halfW + pad, m.halfH + pad, m);
        if (pos) { best[iso] = { fs, pos }; break; }
      }
    });

    // 2) jednotná veľkosť pre všetky trhy
    const fs = Math.min(...isos.map(i => best[i].fs));

    // 3) finálne umiestnenie pri jednotnej veľkosti
    isos.forEach(iso => {
      const t = labelText[iso], g = labels[iso];
      if (!t || !g) return;
      t.style.fontSize = fs + 'px';
      const m = measure(t, anchors[iso]);
      let pos = best[iso].pos;
      if (m) {
        const pad = m.halfH * 0.35;
        pos = placeLabel(iso, m.halfW + pad, m.halfH + pad, m) || pos;
      }
      g.setAttribute('transform', `translate(${pos[0]},${pos[1]})`);
    });
  }

  /* ── domovský výrez ────────────────────── */
  function computeHome() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    Object.keys(MARKETS).forEach(iso => {
      const b = nodes[iso].getBBox();
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
    });
    if (!isFinite(x0)) return;
    const narrow = (view.getBoundingClientRect().width || 1200) < 700;
    const padX = (x1 - x0) * (narrow ? 0.08 : 0.2);
    const padY = (y1 - y0) * (narrow ? 0.08 : 0.18);
    x0 -= padX; x1 += padX; y0 -= padY; y1 += padY;
    // zachovaj pomer strán plátna, aby "slice" neorezal trhy
    const box = view.getBoundingClientRect();
    const ratio = (box.width || 1200) / (box.height || 620);
    let w = x1 - x0, h = y1 - y0;
    if (w / h < ratio) { const nw = h * ratio; x0 -= (nw - w) / 2; w = nw; }
    else { const nh = w / ratio; y0 -= (nh - h) / 2; h = nh; }
    HOME = { x: x0, y: y0, w, h };
    VBW = w; VBH = h;
    svg.setAttribute('viewBox', `${x0} ${y0} ${w} ${h}`);
  }
  function relayout() { computeHome(); fitLabels(); }
  relayout();
  // po načítaní fontov a obrázkov sú rozmery plátna definitívne
  window.addEventListener('load', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  if (window.ResizeObserver) new ResizeObserver(relayout).observe(view);
  else window.addEventListener('resize', relayout);

  /* mapa je pevná — bez priblíženia a posúvania */

  /* ── tooltip ───────────────────────────── */
  const tipName = document.getElementById('mapTipName');
  const tipMeta = document.getElementById('mapTipMeta');
  const tipFlag = document.getElementById('mapTipFlag');

  function showTip(iso, ev) {
    const m = MARKETS[iso];
    if (!m) return;
    tipFlag.textContent = m.flag;
    tipName.textContent = m.name;
    tipMeta.innerHTML =
      `<i class="mtip__dot" style="background:${TIERS[m.tier].fill};border-color:${TIERS[m.tier].color}"></i>${TIERS[m.tier].label}` +
      `<span class="mtip__sep">·</span>${m.firms.length ? m.firms.length + ' ' + plural(m.firms.length, 'firma', 'firmy', 'firiem') : 'vstup v príprave'}`;
    tip.classList.add('is-on');
    tip.setAttribute('aria-hidden', 'false');
    moveTip(ev);
  }

  function moveTip(ev) {
    if (!ev || !tip.classList.contains('is-on')) return;
    const r = view.getBoundingClientRect();
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = ev.clientX - r.left + 16;
    let y = ev.clientY - r.top - h - 12;
    if (x + w > r.width - 12) x = ev.clientX - r.left - w - 16;
    if (y < 12) y = ev.clientY - r.top + 20;
    tip.style.transform = `translate(${Math.max(12, x)}px, ${Math.max(12, y)}px)`;
  }

  function hideTip() {
    tip.classList.remove('is-on');
    tip.setAttribute('aria-hidden', 'true');
  }

  function plural(n, one, few, many) {
    return n === 1 ? one : (n >= 2 && n <= 4 ? few : many);
  }

  /* ── hover / výber ─────────────────────── */
  function setHover(iso) {
    if (state.hover === iso) return;
    if (state.hover && nodes[state.hover]) nodes[state.hover].classList.remove('is-hover');
    state.hover = iso;
    if (iso && nodes[iso]) nodes[iso].classList.add('is-hover');
    Object.keys(MARKETS).forEach(k => labels[k] && labels[k].classList.toggle('is-hover', k === iso));
  }

  gMarkets.addEventListener('pointermove', e => {
    const p = e.target.closest('[data-iso]');
    if (!p) return;
    setHover(p.dataset.iso);
    if (e.pointerType !== 'touch') showTip(p.dataset.iso, e);
  });
  gMarkets.addEventListener('pointerleave', () => { setHover(null); hideTip(); });
  view.addEventListener('pointermove', e => {
    if (!e.target.closest('[data-iso]')) { setHover(null); hideTip(); }
    else moveTip(e);
  });

  gMarkets.addEventListener('click', e => {
    const p = e.target.closest('[data-iso]');
    if (!p) return;
    select(p.dataset.iso);
  });
  gMarkets.addEventListener('keydown', e => {
    const p = e.target.closest('[data-iso]');
    if (p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(p.dataset.iso); }
  });

  /* ── detail panel ──────────────────────── */
  const el = id => document.getElementById(id);

  function select(iso) {
    const m = MARKETS[iso];
    if (!m) return;
    state.selected = iso;
    view.classList.add('has-selection');
    Object.keys(MARKETS).forEach(k => {
      nodes[k].classList.toggle('is-selected', k === iso);
      labels[k].classList.toggle('is-selected', k === iso);
    });

    el('mapPanelFlag').textContent = m.flag;
    el('mapPanelName').textContent = m.name;
    el('mapPanelTier').innerHTML =
      `<i style="background:${TIERS[m.tier].fill};border-color:${TIERS[m.tier].color}"></i>${TIERS[m.tier].label}`;
    el('mapPanelDesc').textContent = m.desc;

    // silueta krajiny
    const geo = GEO.countries[iso];
    const shape = el('mapPanelShape');
    shape.innerHTML = `<path d="${geo.d}" />`;
    fitShape(shape, geo.d);

    el('mapPanelStats').innerHTML = [
      [plural(m.firms.length, 'Firma na trhu', 'Firmy na trhu', 'Firiem na trhu'), m.firms.length || '—'],
      [plural(m.sectors.length, 'Odvetvie', 'Odvetvia', 'Odvetví'), m.sectors.length || '—'],
      ['Vstup na trh', m.since],
      [m.years ? plural(m.years, 'Rok na trhu', 'Roky na trhu', 'Rokov na trhu') : 'Pôsobenie', m.years || '—']
    ].map(([k, v]) => `<div class="mstat"><span class="mstat__v">${v}</span><span class="mstat__k">${k}</span></div>`).join('');

    el('mapPanelScore').textContent = m.score;
    el('mapPanelRank').textContent = `${m.rank}. najsilnejší trh zo ${ranked.length}`;
    const bar = el('mapPanelBar');
    bar.style.width = '0%';
    bar.style.background = TIERS[m.tier].color;
    requestAnimationFrame(() => { bar.style.width = m.score + '%'; });

    el('mapPanelFirms').innerHTML = m.firms.length
      ? `<p class="mpanel__firms-t">Firmy pôsobiace na trhu</p>` + m.firms.map(f =>
          `<button class="mfirm" data-project="${f.id}">
             <img src="${f.logo}" alt="" loading="lazy">
             <span><b>${f.title}</b><em>${f.sector}</em></span>
             <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
           </button>`).join('')
      : `<p class="mpanel__firms-t">Firmy pôsobiace na trhu</p><p class="mpanel__empty">Zatiaľ bez lokálnej entity — trh sa obsluhuje zo Slovenska.</p>`;

    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    syncCtrls();

  }

  function deselect() {
    state.selected = null;
    view.classList.remove('has-selection');
    Object.keys(MARKETS).forEach(k => {
      nodes[k].classList.remove('is-selected');
      labels[k].classList.remove('is-selected');
    });
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    syncCtrls();
  }

  function fitShape(svgEl, d) {
    // dočasne zmeraj bbox a nastav viewBox siluety
    const tmp = svgEl.querySelector('path');
    const bb = tmp.getBBox();
    const pad = Math.max(bb.width, bb.height) * 0.12;
    svgEl.setAttribute('viewBox',
      `${bb.x - pad} ${bb.y - pad} ${bb.width + pad * 2} ${bb.height + pad * 2}`);
  }

  view.addEventListener('click', e => {
    if (e.target.closest('[data-map="close"]') || e.target.closest('#mapPanelGrab')) return deselect();
    if (e.target.closest('.mapui, .mpanel, [data-iso]')) return;
    deselect();
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (panel.classList.contains('is-open')) deselect();
  });

  /* ── legenda ───────────────────────────── */
  const legendItems = document.getElementById('mapLegendItems');
  const legendReset = document.getElementById('mapLegendReset');

  legendItems.innerHTML = [3, 2, 1].map(t => {
    const count = Object.values(MARKETS).filter(m => m.tier === t).length;
    return `<button class="mleg" data-tier="${t}" aria-pressed="false">
      <i style="background:${TIERS[t].fill};border-color:${TIERS[t].color}"></i>
      <span class="mleg__l">${TIERS[t].label}</span>
      <span class="mleg__d">${TIERS[t].desc}</span>
      <span class="mleg__n">${count}</span>
    </button>`;
  }).join('');

  function applyFilter() {
    view.classList.toggle('has-filter', state.filter != null);
    Object.entries(MARKETS).forEach(([iso, m]) => {
      const off = state.filter != null && m.tier !== state.filter;
      nodes[iso].classList.toggle('is-filtered', off);
      labels[iso].classList.toggle('is-filtered', off);
    });
    legendItems.querySelectorAll('.mleg').forEach(b => {
      const on = state.filter === Number(b.dataset.tier);
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    legendReset.hidden = state.filter == null;
    syncCtrls();
  }

  legendItems.addEventListener('click', e => {
    const b = e.target.closest('.mleg');
    if (!b) return;
    const t = Number(b.dataset.tier);
    state.filter = state.filter === t ? null : t;
    applyFilter();
  });
  legendItems.addEventListener('pointerover', e => {
    const b = e.target.closest('.mleg');
    if (!b) return;
    const t = Number(b.dataset.tier);
    Object.entries(MARKETS).forEach(([iso, m]) =>
      nodes[iso].classList.toggle('is-peek', m.tier === t));
    view.classList.add('has-peek');
  });
  legendItems.addEventListener('pointerleave', () => {
    view.classList.remove('has-peek');
    Object.keys(MARKETS).forEach(iso => nodes[iso].classList.remove('is-peek'));
  });
  legendReset.addEventListener('click', () => { state.filter = null; applyFilter(); });

  /* ── ovládanie ─────────────────────────── */
  document.getElementById('mapCtrls').addEventListener('click', e => {
    const b = e.target.closest('[data-map]');
    if (!b) return;
    if (b.dataset.map === 'reset') { deselect(); state.filter = null; applyFilter(); }
  });

  /* tlačidlo "zrušiť" má zmysel len vtedy, keď je čo rušiť */
  function syncCtrls() {
    const ctrls = document.getElementById('mapCtrls');
    if (ctrls) ctrls.hidden = !state.selected && state.filter == null;
  }

  /* ── vyhľadávanie ──────────────────────── */
  const sInput = document.getElementById('mapSearchInput');
  const sList = document.getElementById('mapSearchList');
  const sClear = document.getElementById('mapSearchClear');

  const SEARCHABLE = Object.entries(GEO.countries).map(([iso, c]) => ({
    iso, name: c.sk, market: !!MARKETS[iso]
  }));

  const strip = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function renderResults(q) {
    const needle = strip(q.trim());
    if (!needle) { sList.hidden = true; sList.innerHTML = ''; sInput.setAttribute('aria-expanded', 'false'); return; }
    const hits = SEARCHABLE
      .filter(c => strip(c.name).includes(needle))
      .sort((a, b) => (b.market - a.market) || strip(a.name).indexOf(needle) - strip(b.name).indexOf(needle))
      .slice(0, 6);
    if (!hits.length) {
      sList.innerHTML = `<li class="msearch__empty">Žiadna zhoda</li>`;
    } else {
      sList.innerHTML = hits.map((h, i) => {
        const m = MARKETS[h.iso];
        return `<li role="option" aria-selected="false"><button data-goto="${h.iso}" ${i === 0 ? 'data-first' : ''}>
          <span>${h.name}</span>
          ${m ? `<em style="--c:${TIERS[m.tier].color}">${TIERS[m.tier].label}</em>` : `<em class="msearch__off">mimo pôsobnosti</em>`}
        </button></li>`;
      }).join('');
    }
    sList.hidden = false;
    sInput.setAttribute('aria-expanded', 'true');
  }

  sInput.addEventListener('input', () => {
    sClear.hidden = !sInput.value;
    renderResults(sInput.value);
  });
  sInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') { sInput.value = ''; sClear.hidden = true; renderResults(''); sInput.blur(); }
    if (e.key === 'Enter') {
      const first = sList.querySelector('[data-goto]');
      if (first) first.click();
    }
    if (e.key === 'ArrowDown') {
      const first = sList.querySelector('[data-goto]');
      if (first) { e.preventDefault(); first.focus(); }
    }
  });
  sClear.addEventListener('click', () => {
    sInput.value = ''; sClear.hidden = true; renderResults(''); sInput.focus();
  });
  sList.addEventListener('click', e => {
    const b = e.target.closest('[data-goto]');
    if (!b) return;
    goTo(b.dataset.goto);
  });
  sList.addEventListener('keydown', e => {
    const items = [...sList.querySelectorAll('[data-goto]')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' && i < items.length - 1) { e.preventDefault(); items[i + 1].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? items[i - 1] : sInput).focus(); }
    if (e.key === 'Escape') { sInput.focus(); }
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#mapSearch')) { sList.hidden = true; sInput.setAttribute('aria-expanded', 'false'); }
  });

  function goTo(iso) {
    const c = GEO.countries[iso];
    if (!c) return;
    sList.hidden = true;
    sInput.value = c.sk;
    sClear.hidden = false;
    sInput.setAttribute('aria-expanded', 'false');
    if (MARKETS[iso]) select(iso);
    else { deselect(); flash(iso); }
  }

  function flash(iso) {
    const n = nodes[iso];
    if (!n) return;
    n.classList.add('is-flash');
    setTimeout(() => n.classList.remove('is-flash'), 1400);
  }

  /* ── KPI z dát ─────────────────────────── */
  el('kpiCountries').textContent = Object.keys(MARKETS).length;
  el('kpiFirms').textContent = PROJECTS.length;
  el('kpiSectors').textContent = new Set(PROJECTS.map(p => p.sector)).size;

  /* ── klik na firmu v paneli otvorí modal ── */
  panel.addEventListener('click', e => {
    const b = e.target.closest('[data-project]');
    if (b && window.openProjectModal) window.openProjectModal(b.dataset.project);
  });

  /* ── swipe-down zatvorí bottom sheet ───── */
  let sheet = null;
  panel.addEventListener('pointerdown', e => {
    if (window.innerWidth > 860) return;
    if (!e.target.closest('.mpanel__grab') && panel.scrollTop > 0) return;
    sheet = { y: e.clientY };
  });
  panel.addEventListener('pointermove', e => {
    if (!sheet) return;
    const dy = e.clientY - sheet.y;
    if (dy > 0) panel.style.transform = `translateY(${dy}px)`;
  });
  panel.addEventListener('pointerup', e => {
    if (!sheet) return;
    const dy = e.clientY - sheet.y;
    panel.style.transform = '';
    if (dy > 90) deselect();
    sheet = null;
  });

  /* ── štart ─────────────────────────────── */
  applyFilter();

  // úvodná animácia: krajiny sa postupne rozsvietia
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      view.classList.add('is-live');
      ranked.slice().reverse().forEach((m, i) => {
        setTimeout(() => nodes[m.iso].classList.add('is-lit'), reduce ? 0 : 90 * i);
      });
      obs.disconnect();
    });
  }, { threshold: 0.25 });
  io.observe(view);
})();
