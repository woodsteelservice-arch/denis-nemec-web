/* ═══════════════════════════════════════════
   Denis Nemec — interakcie
   ═══════════════════════════════════════════ */

/* ── štart vždy na úvodnej sekcii ────────── */
window.scrollTo(0, 0);
/* ak používateľ medzitým sám scrolloval, už ho nevraciame hore */
let userScrolled = false;
const markScroll = () => { userScrolled = true; };
['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(ev =>
  window.addEventListener(ev, markScroll, { passive: true, once: true }));
/* skok na sekciu cez menu tiež znamená, že hore už nevraciame */
window.addEventListener('hashchange', markScroll);
window.addEventListener('load', () => { if (!userScrolled) window.scrollTo(0, 0); });
/* návrat z histórie (bfcache) */
window.addEventListener('pageshow', e => { if (e.persisted) window.scrollTo(0, 0); });

/* ── dáta projektov ──────────────────────── */
const PROJECTS = [
  {
    id: 'brixstone',
    markets: ['SVK'],
    title: 'Brixstone Capital',
    sector: 'Nehnuteľnosti & investície',
    short: 'Špecializácia na akvizíciu a predaj podhodnotených rezidenčných nehnuteľností a financovanie realitných projektov.',
    text: 'Brixstone Capital vyhľadáva podhodnotené rezidenčné nehnuteľnosti, prevádza ich cez rekonštrukciu a legalizáciu do predajného stavu a zabezpečuje financovanie realitných projektov pre partnerov.',
    img: 'img/proj-brixstone.jpg',
    logo: 'img/logo-brixstone.jpg',
    facts: ['Akvizícia podhodnotených nehnuteľností', 'Financovanie realitných projektov', 'Rezidenčné portfólio SK / CZ']
  },
  {
    id: 'woodsteel',
    markets: ['SVK','AUT','POL'],
    title: 'Woodsteel',
    sector: 'Výroba & stavebné časti',
    short: 'Stavebné časti exteriéru z dreva a hliníka. Špecializácia na výrobu okien, zasklení, zimných záhrad a pergol.',
    text: 'Woodsteel vyrába a montuje exteriérové stavebné časti z dreva a hliníka — okná, zasklenia, zimné záhrady a pergoly. Vlastná výroba, vlastná montáž, kontrola kvality v celom reťazci.',
    img: 'img/proj-woodsteel.jpg',
    logo: 'img/logo-woodsteel.png',
    facts: ['Okná, zasklenia, zimné záhrady, pergoly', 'Drevo & hliník', 'Vlastná výroba aj montáž']
  },
  {
    id: 'euroscaff',
    markets: ['DEU','SVK'],
    title: 'Euroscaff',
    sector: 'Personálne služby & subdodávky',
    short: 'Návrh, montáž a subdodávky a personálne služby pre nemecký trh — kvalifikovaní remeselníci.',
    text: 'Euroscaff zabezpečuje stavebné subdodávky a personálne služby pre nemecký trh. Poskytuje kvalifikovaných remeselníkov pre fasádne, strešné a montážne práce vrátane kompletného administratívneho zázemia.',
    img: 'img/proj-euroscaff.jpg',
    logo: 'img/logo-euroscaff.png',
    facts: ['Nemecký trh', 'Fasádne, strešné a montážne práce', 'Kvalifikovaní remeselníci']
  },
  {
    id: 'ensola',
    markets: ['SVK','CZE'],
    title: 'Ensola',
    sector: 'Energetika',
    short: 'Návrh, montáž a servis fotovoltických systémov, tepelných čerpadiel, klimatizácií a batériových úložísk energie.',
    text: 'Ensola navrhuje, montuje a servisuje fotovoltické systémy, tepelné čerpadlá, klimatizácie a batériové úložiská energie pre domácnosti aj firmy — od projektu cez dotácie až po dlhodobý servis.',
    img: 'img/proj-ensola.jpg',
    logo: 'img/logo-ensola.png',
    facts: ['Fotovoltika & batériové úložiská', 'Tepelné čerpadlá a klimatizácie', 'Domácnosti aj firmy']
  },
  {
    id: 'history',
    markets: ['SVK'],
    title: 'History Caffe & Bakery',
    sector: 'Gastronómia',
    short: 'Gastronomický koncept zastrešujúci dve prevádzky v Prievidzi s vlastnou pekárskou výrobou.',
    text: 'History Caffe & Bakery je gastronomický koncept s dvomi prevádzkami v Prievidzi a vlastnou pekárskou výrobou — kaviareň, pekáreň a denné menu pod jednou značkou.',
    img: 'img/proj-history.jpg',
    logo: 'img/logo-history.jpg',
    facts: ['2 prevádzky v Prievidzi', 'Vlastná pekárska výroba', 'Kaviareň + bakery koncept']
  }
];

/* ── render kariet ───────────────────────── */
const grid = document.getElementById('projectsGrid');
grid.innerHTML = PROJECTS.map((p, i) => `
  <article class="card reveal" data-delay="${Math.min(i, 4)}" data-project="${p.id}" tabindex="0" role="button" aria-label="${p.title} — detail">
    <div class="card__media">
      <img class="card__photo" src="${p.img}" alt="${p.title}" loading="lazy">
      <span class="card__no">${String(i + 1).padStart(2, '0')}</span>
      <img class="card__logo" src="${p.logo}" alt="" loading="lazy">
    </div>
    <div class="card__body">
      <p class="card__sector">${p.sector}</p>
      <h3 class="card__title">${p.title}</h3>
      <p class="card__text">${p.short}</p>
      <span class="card__more">
        Detail
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M13 6l6 6-6 6"/></svg>
      </span>
    </div>
  </article>
`).join('');

/* klávesnicová obsluha kariet */
grid.addEventListener('keydown', e => {
  const card = e.target.closest('[data-project]');
  if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openModal(card.dataset.project); }
});

/* ── modal ───────────────────────────────── */
const modal = document.getElementById('modal');
let lastFocus = null;

function openModal(id) {
  const p = PROJECTS.find(x => x.id === id);
  if (!p) return;
  lastFocus = document.activeElement;
  document.getElementById('modalImg').src = p.img;
  document.getElementById('modalImg').alt = p.title;
  document.getElementById('modalLogo').src = p.logo;
  document.getElementById('modalTitle').textContent = p.title;
  document.getElementById('modalSector').textContent = p.sector;
  document.getElementById('modalText').textContent = p.text;
  document.getElementById('modalFacts').innerHTML = p.facts.map(f => `<li>${f}</li>`).join('');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  modal.querySelector('.modal__x').focus();
}

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (lastFocus) lastFocus.focus();
}

document.addEventListener('click', e => {
  const trigger = e.target.closest('[data-project]');
  if (trigger) return openModal(trigger.dataset.project);
  if (e.target.closest('[data-close]')) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
});

/* ── scroll reveal ───────────────────────── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -60px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ── počítadlá ───────────────────────────── */
const statsObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.querySelectorAll('.stat__num').forEach(el => {
      const to = Number(el.dataset.to);
      const suffix = el.dataset.suffix || '';
      const dur = 1400;
      const start = performance.now();
      const tick = now => {
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(to * eased) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    obs.unobserve(entry.target);
  });
}, { threshold: 0.4 });

statsObserver.observe(document.getElementById('stats'));

/* ── nav: sticky, burger, aktívna sekcia ─── */
const nav = document.getElementById('nav');
const navLinks = document.getElementById('navLinks');
const burger = document.getElementById('burger');
const toTop = document.getElementById('toTop');

burger.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
});
navLinks.addEventListener('click', e => {
  if (e.target.tagName === 'A') {
    navLinks.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  }
});

const sections = ['about', 'projekty', 'kontakt'].map(id => document.getElementById(id));

function onScroll() {
  const y = window.scrollY;
  nav.classList.toggle('stuck', y > 40);
  toTop.classList.toggle('show', y > 700);

  let current = '';
  sections.forEach(s => {
    if (s && s.getBoundingClientRect().top <= 140) current = s.id;
  });
  navLinks.querySelectorAll('a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ── parallax hero portrétu ──────────────── */
const portrait = document.querySelector('.hero__portrait');
if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < window.innerHeight) portrait.style.transform = `translateY(${y * 0.12}px)`;
  }, { passive: true });
}

/* ── kontaktný formulár ──────────────────── */
const form = document.getElementById('contactForm');
const status = document.getElementById('formStatus');

function setError(field, msg) {
  const span = field.parentElement.querySelector('.err');
  if (span) span.textContent = msg;
  field.style.borderColor = msg ? '#e07a6a' : '';
}

form.addEventListener('input', e => {
  if (e.target.matches('input,textarea')) setError(e.target, '');
});

form.addEventListener('submit', e => {
  e.preventDefault();
  status.textContent = '';
  let ok = true;

  const meno = form.meno, email = form.email, sprava = form.sprava;

  if (meno.value.trim().length < 2) { setError(meno, 'Zadajte meno a priezvisko.'); ok = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) { setError(email, 'Zadajte platný e-mail.'); ok = false; }
  if (sprava.value.trim().length < 10) { setError(sprava, 'Správa musí mať aspoň 10 znakov.'); ok = false; }

  if (!ok) return;

  // Lokálne: uloží dopyt do localStorage a otvorí mailový klient.
  const data = {
    meno: meno.value.trim(),
    email: email.value.trim(),
    predmet: form.predmet.value,
    sprava: sprava.value.trim(),
    cas: new Date().toISOString()
  };
  const box = JSON.parse(localStorage.getItem('dn_dopyty') || '[]');
  box.push(data);
  localStorage.setItem('dn_dopyty', JSON.stringify(box));

  const body = `Meno: ${data.meno}\nE-mail: ${data.email}\n\n${data.sprava}`;
  window.location.href =
    `mailto:info@denisnemec.com?subject=${encodeURIComponent(data.predmet)}&body=${encodeURIComponent(body)}`;

  status.textContent = 'Ďakujem — správa je pripravená vo vašom mailovom klientovi.';
  form.reset();
});

/* ── ponuky spolupráce → predvyplnia formulár ── */
document.querySelectorAll('[data-offer]').forEach(btn => {
  btn.addEventListener('click', () => {
    const subject = document.getElementById('contactSubject');
    if (subject) subject.value = btn.dataset.offer;
    document.getElementById('kontakt').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => form.meno.focus({ preventScroll: true }), 700);
  });
});

/* ── sprístupnenie dát pre mapu (map.js) ── */
window.PROJECTS = PROJECTS;
window.openProjectModal = openModal;
