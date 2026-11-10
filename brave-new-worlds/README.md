# Brave New Worlds

Een 3D city builder op een hele planeet: kaal begin, een handvol kolonisten,
en een aanvoerketen die je zelf opbouwt — van ijzererts en ruwe olie, via
staal en kunststof, tot elektronica die je aan de kade verkoopt. Gemaakt met
HTML, CSS en JS; de enige afhankelijkheid is [three.js](https://threejs.org)
(r128, van een CDN) — net als [maanbasis](../maanbasis), waar dit project
zijn camerabesturing bijna woordelijk van overneemt.

## Starten

Open `index.html` in de browser — dubbelklikken volstaat, er is geen server
nodig. Wel internet, want three.js komt van cdnjs.

## Besturing

Precies dezelfde bediening als `maanbasis`, alleen om een planeet in plaats
van een maan:

| Actie | Hoe |
| --- | --- |
| Draaien | slepen met de muis, of de pijltjestoetsen |
| Randscroll | cursor tegen de schermrand houden |
| Draaipunt kiezen | muiswiel indrukken en slepen |
| Draaipunt op touch | een halve seconde met je vinger stil blijven drukken |
| Zoomen | scrollen, knijpen op touch, of `+` / `−` |
| Selecteren | klik op een gebouw |
| Bouwen | klik een gebouw in de balk, dan een blauwe (of groene) ring op de planeet |
| Annuleren | `Esc` |

## Het spel

Je begint met een woonwijk, een zonnepark en een akker, ergens op het
noordelijk halfrond. De rest van de planeet moet je zelf verkennen: draai
hem rond om **ijzeraders** (een bruine vlek) en **olievelden** (een zwarte
vlek) te vinden — daar, en alléén daar, mag je een mijn of bron bouwen.

De aanvoerketen:

1. **IJzermijn** wint ijzererts, **oliebron** wint ruwe olie — allebei
   kosten ze stroom.
2. **Staalfabriek** smelt ijzererts om tot staal, **raffinaderij** kraakt
   ruwe olie tot kunststof. Beide verbruiken meer grondstof dan er product
   uitkomt — en iets méér dan één mijn per fabriek kan bijbenen, dus een
   fabriek zonder reservevoorraad valt af en toe stil.
3. **Elektronicafabriek** bouwt uit staal én kunststof het eindproduct —
   verreweg het meest waard per eenheid.
4. **Exporthaven** — alleen aan de kust te bouwen — verscheept je voorraad.
   Een schip vaart uit, verkoopt onderweg (elektronica eerst, dan staal en
   kunststof, dan de ruwe grondstoffen), en komt terug. Hoe verder verwerkt
   je lading, hoe meer ze oplevert: ruwe grondstof aan de kade zetten is
   verreweg de minst winstgevende manier om van je voorraad af te komen.

Stroom en voedsel werken zoals in maanbasis: zonneparken leveren alleen
overdag — en omdat de planeet draait, heeft élk gebouw zijn eigen dag en
nacht, niet de hele kolonie tegelijk. Akkers maken voedsel, maar alleen mét
stroom. Genoeg voedsel en woonruimte, en er komt vanzelf een kolonist bij.

Woonwijken staan verspreid over de hele planeet; bij elke woonwijk loopt een
eigen groepje kolonisten rond (tot vier zichtbaar per wijk, de rest werkt
"binnen" — zelfde afspraak als in maanbasis, alleen nu per wijk in plaats
van in totaal).

## Wat wél en niet apart geboekhouden wordt

Stroom, voedsel en alle vijf grondstoffen zijn steeds **één gedeelde
voorraad voor de hele planeet** — ook als je mijnen, fabrieken en havens
duizenden kilometers uit elkaar bouwt. Denk aan het als één planeetbreed
logistiek netwerk, geen aparte boekhouding per nederzetting. Dat is een
bewuste vereenvoudiging (net als maanbasis met zijn ene basis), niet een
gat in de simulatie.

## Opbouw

| Bestand | Wat erin zit |
| --- | --- |
| `index.html` | de HUD, het grondstoffenpaneel, het hulpscherm en de scripttags |
| `style.css` | de opmaak van alles wat over de 3D-scène heen ligt |
| `utils.js` | rekenhulpjes en gezaaide random — vrijwel gelijk aan maanbasis |
| `planet.js` | de bol: continenten en oceanen, de bouwplekken (met ijzer/olie/kust), en het lokale u/v-stelsel per woonwijk |
| `buildings.js` | de negen gebouwen als losse `THREE.Group`s, plus hun kosten, verbruik en opbrengst |
| `colonists.js` | de poppetjes: één groepje per woonwijk, elk in zijn eigen lokale stelsel |
| `world.js` | renderer, camera, licht, sterren, zon en een kale maan aan de hemel |
| `controls.js` | de camera — nagenoeg een letterlijke kopie van maanbasis |
| `game.js` | bouwplekken, de hele aanvoerketen, HUD, selectie, opslaan en de export |
| `main.js` | alles aan elkaar knopen en de tekenlus |

Alles hangt aan de globale `BNW` (in plaats van `MB`); de volgorde van de
scripttags in `index.html` telt, `utils` eerst, `main` als laatste. Vanuit de
console: `BNW.spel.staat.krediet = 99999` doet wat je verwacht.

## Verschillen met maanbasis, en waarom

- **Eén basis → een hele planeet.** De maan had één vlakke laagvlakte met
  negentien bouwplekken rond een vast middelpunt. Hier ligt een vaste
  verzameling van zo'n negentig bouwbare plekken verspreid over alle
  continenten (op een Fibonacci-bol, gefilterd op land) — je mag overal
  bouwen, maar ijzer/olie/kust liggen vast.
- **Geen glob​ale dag/nacht.** Op de maan had de hele basis dezelfde
  zonligging. Hier bepaalt de plek van een gebouw op de draaiende planeet
  zíjn eigen dag en nacht.
- **Poppetjes per wijk, niet per basis.** `colonists.js` is generiek gemaakt
  (een los lokaal u/v-stelsel per aanroep) zodat elke woonwijk zijn eigen
  groepje wandelaars krijgt, in plaats van één groepje voor de hele kolonie.
- **Eén stap → een keten.** De maan had precies één productiestap (regoliet
  → brandstof → lancering). Hier zijn het er drie na elkaar (winnen →
  verwerken → produceren), met knelpunten die vanzelf ontstaan als je te
  weinig mijnen per fabriek bouwt.

## Een eerlijke noot over balans

De aanvoerketen is doorgerekend (grondstofstromen kunnen niet negatief
worden, voorraden lopen niet over hun opslagcapaciteit heen, en verwerkte
waar is ruim twee keer zoveel waard als de ruwe grondstof die ervoor nodig
was), maar niet urenlang gespeeld en bijgeschaafd. Vind je het te makkelijk
of te traag, dan zijn `DEFS` in `buildings.js` en de constantes bovenin
`game.js` (zoals `DRAAI`, `ETEN`, `CARGO_MAX`) de eerste plek om aan te
draaien.
