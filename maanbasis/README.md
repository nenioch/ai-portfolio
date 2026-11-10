# Maanbasis v4 — Ruimtestation

Een klein 3D-spel: een kale planetoïde waar je met een vrachtschip aanmeert en
een ruimtestation opbouwt. Je draait eromheen, zoomt in en uit, en houdt het
station draaiende. Gemaakt met HTML, CSS en JS; de enige afhankelijkheid is
[three.js](https://threejs.org) (r128, van een CDN).

v4 voegt v2 en v3 samen:

- uit **v2** het ruimtestation op een planetoïde, met de aarde aan de hemel,
  zuurstof- en waterfabrieken, en een dockingstation waar vrachtschepen
  vertrekken en weer aanmeren;
- uit **v3** de aankomst: je begint niet met een kant-en-klaar station, maar met
  een vrachtschip dat op het dock neerkomt en het bouwmateriaal meebrengt.

## Starten

Open `index.html` in de browser — dubbelklikken volstaat, er is geen server
nodig. Wel internet, want three.js komt van cdnjs.

## Het aanmeren

Zodra het beeld er staat, hangt de camera aan het vrachtschip dat uit de zwarte
hemel op het dockingstation zakt: eerst vrije val met de planetoïde onder je,
dan de remraketten, dan gruis, en de dokklemmen die dichtklappen. Onderin
loopt een bijschrift mee; `Aanmeren overslaan` of `Esc` slaat de daling over.

Daarna verschijnt de kaart: *Nova 3 is aangemeerd op de planetoïde*. Er gaan
geen mensen mee: jij stuurt de missie op afstand. Het vrachtruim gaat open en
levert **380 regoliet** (bouwblokken van geperst maangruis) en twee werkrobots.
Daarmee zet je je eerste modules neer. `Bouwen maar` begint, `Eerst de uitleg` opent het hulpscherm.

Zolang het aanmeren loopt staat de rest van het spel stil: de planetoïde draait
niet, er wordt niets verbruikt en de HUD is nog niet in beeld.

## Besturing

| Actie | Hoe |
| --- | --- |
| Draaien | slepen met de muis, of de pijltjestoetsen |
| Randscroll | cursor tegen de schermrand houden |
| Draaipunt kiezen | muiswiel indrukken en slepen, zoals in Cities: Skylines |
| Draaipunt op touch | een halve seconde met je vinger stil blijven drukken |
| Zoomen | scrollen, knijpen op touch, of `+` / `−` |
| Selecteren | klik op een module |
| Bouwen | klik een module in de balk, dan een blauwe ring op het platform |
| Annuleren | `Esc` |

Normaal draait de camera om het middelpunt van de planetoïde. Druk je het
muiswiel in, dan verhuist het draaipunt naar wat er onder de cursor zit — een
module, het schip in het dock, een robot of gewoon een plek op het
gesteente — en draai je daaromheen. Op een telefoon doe je hetzelfde door je
vinger een halve seconde stil te houden. Het kan ook via het zijpaneel: selecteer
een module en klik *Camera hieromheen draaien*, of *Camera op het schip*. `Esc`
zet het draaipunt terug in het midden.

`Volg station` houdt de camera boven het station terwijl de planetoïde draait.
`Draaiing` zet de omwenteling (≈140 s) stil. `Randscroll` zet het meeschuiven uit.

## Naam en bewaren

Linksboven staat de naam van je station; klik erop en typ een nieuwe. Die naam
komt ook in de titelbalk van het tabblad en bepaalt de bestandsnaam als je
opslaat.

`Opslaan` schrijft het hele station naar `<jouw-naam>.ruimtestation.json`
(versie 6): de naam, alle modules met hun plek en toestand, de voorraden, de
robots, de stand van de planetoïde en de knoppen in de bovenbalk. `Laden`
opent zo'n bestand weer — of sleep het gewoon op het venster. Een bestand laden
tijdens het aanmeren kan ook: de intro stopt dan meteen.

Saves uit v2 werken nog; die gelden als "vracht al gelost". Krediet uit oudere
saves wordt bij het laden evenveel regoliet, bemanning wordt robots, woonmodules
worden robotwerkplaatsen en kweekkassen vallen weg. Saves uit v1 en v3
(`.maanbasis.json`) horen bij de maanversie en worden niet geopend.

## Het spel

Je begint kaal: alleen het dockingstation met het schip erin, twee robots en
het regoliet uit het vrachtruim. Robots eten, drinken en ademen niet — ze leven
op stroom (0,25/s per robot). Bouw dus eerst een zonnepaneel, dan een
regolietgraver, en daarna een zuurstof- en waterfabriek. Samen kost dat 220
regoliet; de rest is genoeg voor een robotwerkplaats of een tweede paneel.

Er is geen geld — op een kale rots is dat niets waard. Bouwen kost grondstoffen:

| Module | Kosten |
| --- | --- |
| Zonnepaneel | 40 regoliet |
| Regolietgraver | 45 regoliet |
| Waterfabriek | 65 regoliet |
| Zuurstoffabriek | 70 regoliet |
| Brandstoftank | 80 regoliet · 15 water |
| Robotwerkplaats | 110 regoliet |
| Dockingstation | 150 regoliet · 40 brandstof |

Slopen geeft de helft van het regoliet terug.

- **Robots** laden op uit het stroomnet. Zijn de accu's leeg en dekt de opwek
  minder dan 60% van de vraag, dan valt er na 25 s een robot stil (de laatste
  blijft altijd over).
- **Robotwerkplaatsen** bieden vier laadplaatsen en zetten elke 35 s een nieuwe
  robot in elkaar (30 regoliet per stuk), zolang er plek vrij is en de stroom
  volstaat. De montagearm beweegt alleen als er gebouwd wordt.
- **Regolietgravers** graven maangruis af en bakken er bouwblokken van; zonder
  graver groeit het station niet.
- **Zonnepanelen** leveren alleen stroom aan de zonzijde. De accu moet je door
  de schaduw helpen.
- **Zuurstoffabrieken** en **waterfabrieken** winnen zuurstof en waterijs uit
  het gesteente.
- **Brandstoftanks** maken raketbrandstof van water (0,4/s) en zuurstof
  (0,3/s). Ze stoppen vanzelf als de tank vol is of een van de twee op is.
- **Het dockingstation** stuurt voor 60 brandstof het aangemeerde schip naar de
  naburige brokstukken; als het terugkomt lost het regoliet (40 + 12 per robot
  die bij vertrek laadde).

Bij stroomtekort draaien alle verbruikers evenredig langzamer — dat zie je
terug in de tarieven in de bovenbalk.

## Opbouw

| Bestand | Wat erin zit |
| --- | --- |
| `index.html` | de HUD, de aanmeerkaart, het hulpscherm en de scripttags |
| `style.css` | de opmaak van alles wat over de 3D-scène heen ligt |
| `utils.js` | rekenhulpjes en gezaaide random |
| `rock.js` | de planetoïde: kraters, hoogtefunctie, het vlakke dok-platform en het tangentiële stelsel waarin het station ligt |
| `buildings.js` | de zeven modules als losse `THREE.Group`s, hun kosten in grondstoffen en opbrengsten, en de geloste vrachtkisten |
| `crew.js` | de robots: model, looproutes en de loopanimatie |
| `world.js` | renderer, camera, licht, sterren, zon en de aarde (met wolkendek) aan de hemel |
| `controls.js` | camera die om een draaipunt cirkelt; slepen, scrollen, knijpen, klikken |
| `game.js` | bouwplekken, huishouding, HUD, selectie, opslaan en het dockingstation |
| `intro.js` | het aanmeren: daalbaan van het schip, camera, gruiswolk en de kaart erna |
| `main.js` | alles aan elkaar knopen en de tekenlus |

Alles hangt aan de globale `MB`; alleen de volgorde van de scripttags in
`index.html` telt: `utils` eerst, `main` als laatste.

Vanuit de console zijn `MB.wereld`, `MB.controls`, `MB.spel` en `MB.intro`
bereikbaar — `MB.spel.staat.regoliet = 9999` doet wat je verwacht.
