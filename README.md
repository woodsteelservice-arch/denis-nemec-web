# Denis Nemec — osobný web

Plne funkčný statický web podľa návrhu `Navrh - Web Design - Denis Nemec - PDF.pdf`.
Bez buildu, bez závislostí — čisté HTML / CSS / JS.

## Spustenie

```bash
cd ~/Desktop/denis-nemec-web
python3 -m http.server 5173
```
Potom otvor http://localhost:5173

(Dá sa otvoriť aj dvojklikom na `index.html`, ale cez server sa načítajú
obrázky a fonty spoľahlivejšie.)

## Štruktúra

```
index.html      — celá stránka (sekcie: hero, bilancia, mapa, princípy,
                  projekty, prístup, šport, spolupráca, kontakt, footer)
styles.css      — dizajn, responzivita, animácie
main.js         — dáta projektov, modaly, počítadlá, reveal, nav, formulár
map.js          — interaktívna mapa pôsobnosti (choropleth, panel, filtre)
map-data.js     — geometria Európy (Natural Earth 50m, projekcia LAEA),
                  zemepisná mriežka a východiskové body pre popisky
img/            — obrázky a logá vyextrahované z PDF návrhu
```

## Čo je funkčné

- **Navigácia** — sticky hlavička, zvýraznenie aktívnej sekcie, hamburger menu do 820 px
- **Hero** — parallax portrét, animovaný vstup, scroll indikátor
- **Bilancia** — počítadlá (8+, 250+, 35 %, 60+) sa animujú pri scrolle
- **Mapa pôsobnosti** — vektorový choropleth Európy (žiadna externá knižnica):
  - 3 kategórie intenzity: domáci / aktívny / rozvíjaný trh
  - hover so zlatým zvýraznením a tooltipom, klik otvára detail panel
    (na mobile bottom sheet so swipe-down zatvorením)
  - detail: vlajka, silueta krajiny, metriky, index pôsobenia s progress barom,
    poradie trhu a firmy pôsobiace na trhu (klik otvorí ich detail)
  - interaktívna legenda — hover zvýrazní kategóriu, klik ju filtruje
  - mapa je pevná — bez priblíženia, oddialenia a posúvania
  - vyhľadávanie krajiny (výsledok krajinu vyberie a otvorí jej detail)
  - popisky iba pre trhy skupiny, všetky rovnako veľké; poloha aj veľkosť
    sa dopočítavajú tak, aby text vždy ležal celý vnútri územia krajiny
    (kontrolu robí prehliadač cez `isPointInFill` nad SVG cestou)
- **Projekty** — 5 kariet generovaných z poľa `PROJECTS` v `main.js`; celá karta
  je klikateľná (aj z klávesnice) a otvára detail v modálnom okne
  (Esc / klik mimo zatvorí)
- **Spolupráca** — 3 ponuky (kapitálový vstup / odpredaj firmy / spoločné
  investície); tlačidlo v karte odscrolluje na formulár a predvyplní predmet
- **Kontakt** — formulár s validáciou; po odoslaní uloží dopyt do
  `localStorage` (kľúč `dn_dopyty`) a otvorí mailového klienta na
  `info@denisnemec.com`
- **Scroll reveal** animácie, tlačidlo „hore“, rešpektuje `prefers-reduced-motion`

## Ako upraviť obsah

- **Texty projektov / pridanie firmy** → pole `PROJECTS` na začiatku `main.js`.
  Pole `markets` (ISO kódy krajín) určuje, na ktorých trhoch sa firma zobrazí
  v mape — metriky v detail paneli sa z neho dopočítavajú automaticky.
- **Trhy na mape** → objekt `MARKETS` na začiatku `map.js` (kategória `tier`,
  rok vstupu `since`, vlajka a popis). Kategórie a ich farby sú v `TIERS`.
- **Čísla v Bilancii** → atribúty `data-to` a `data-suffix` v `index.html`
- **Ponuky spolupráce** → sekcia `.offer` v `index.html`; atribút `data-offer`
  na tlačidle musí sedieť s hodnotou v `<select name="predmet">`
- **Odkazy na sociálne siete** → sekcia `.contact__soc` v `index.html`
  (teraz smerujú na domovské stránky LinkedIn / YouTube / Instagram)
- **Farby** → premenné v `:root` v `styles.css` (`--accent` je zlatá `#c9b48a`)

## Poznámky k dátam mapy

Kategórie trhov, roky vstupu a priradenie firiem k trhom sú prvotný odhad
podľa podkladov z návrhu — pred zverejnením ich treba potvrdiť. „Index
pôsobenia" je odvodená hodnota (kategória 45 % + zastúpenie firiem 35 % +
dĺžka pôsobenia 20 %), nie externá metrika; vzorec je v `map.js`.

## Poznámky

- Obrázky sú vyextrahované priamo z PDF, takže majú rozlíšenie návrhu
  (~1000–1500 px). Pre ostrejšie zobrazenie na retina displejoch odporúčam
  nahradiť ich originálmi vo `img/` pod rovnakými názvami.
- Formulár nemá backend — na živom webe treba doplniť napr. Formspree,
  Netlify Forms alebo vlastný endpoint v `main.js` (funkcia pri `submit`).
