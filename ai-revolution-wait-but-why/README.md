# The AI Revolution (Wait But Why)

Een geanimeerde samenvatting van het artikel *The AI Revolution: The Road to Superintelligence* van Tim Urban (Wait But Why, januari 2015), inclusief het vervolg *Our Immortality or Extinction*. Het zijn 16 scènes van 12 seconden (3 minuten en 12 seconden in totaal). Alles wordt live getekend op een `<canvas>` en de muziek wordt live gemaakt met de Web Audio API. Er zijn geen afbeeldingen, frameworks of build-stap nodig.

Opzet, vormgeving en bediening zijn hetzelfde als in het project `heelal`.

## Starten

Open `ai-revolution-wait-but-why.html` in een browser. Een lokale webserver is niet nodig.

De animatie en de muziek starten vanzelf. Sommige browsers laten geluid pas toe na een eerste klik of toets op de pagina. In dat geval start die eerste klik (of spatie) alleen de muziek, en pauzeert hij de animatie niet.

## Bediening

| Toets / knop | Actie |
|---|---|
| Klik op het beeld, spatie | Pauzeren / afspelen |
| ← → | Vorige / volgende scène |
| H | Tekst verbergen of tonen |
| M | Muziek dempen |
| Muzieknoot-knop | Eigen muziekbestand kiezen (nog een keer klikken: terug naar de ingebouwde score) |

De tijdlijn onderin is klikbaar. De bediening verdwijnt na 3 seconden zonder muisbeweging.

### URL-parameters

- `?t=40`: begin op seconde 40
- `?paused`: begin gepauzeerd

Als het systeem *verminderde beweging* (`prefers-reduced-motion`) aangeeft, start de animatie gepauzeerd.

## De scènes

1. De tijdreiziger (de *Die Progress Unit*)
2. Steeds sneller (de wet van de versnellende meeropbrengst)
3. Waarom we het niet zien (lineair denken, S-curven)
4. Drie niveaus van AI (ANI, AGI, ASI)
5. Smalle AI is overal
6. Moeilijk is makkelijk (paradox van Moravec)
7. Genoeg rekenkracht
8. Een brein bouwen
9. Sneller dan biologie
10. Twee treden hoger (de trap van intelligentie)
11. De intelligentie-explosie
12. De evenwichtsbalk
13. Wanneer? (de enquête van Müller en Bostrom, Kurzweil)
14. Optimisten en zorgenmakers
15. Het verhaal van Turry
16. Jij bent hier

In scène 13 markeert een witte lijn het huidige jaar. Dat jaar komt uit de klok van de computer.

## Muziek

Standaard speelt een zelf gegenereerde synthesizerscore in de stijl van Vangelis (*Blade Runner*) en Tangerine Dream. Die loopt synchroon met de animatie, ook als je doorspoelt of pauzeert.

- Scène 1 begint in 1750 op een klavecimbel. Bij de sprong naar 2015 nemen de synthesizers het over.
- Een sequencer-baslijn loopt onder de scènes over vooruitgang en rekenkracht, en gaat in *Steeds sneller* en *De intelligentie-explosie* letterlijk steeds sneller.
- Data-piepjes klinken bij smalle AI en het neurale netwerk, en een speeldoos bij het onschuldige begin van Turry.
- Een terugkerend thema klinkt zacht in *Waarom we het niet zien*, in majeur bij de optimisten en voluit in het slot.
- Op de grote momenten zwelt een koperachtig akkoord aan en volgt een diepe klap: de tijdsprong, ASI, de top van de trap, de explosie, het struikeldraad en Turry.

Wil je eigen muziek, dan kan dat op twee manieren:

- Zet een bestand in `muziek/soundtrack.mp3`. Als dat bestand bestaat, wordt het automatisch gebruikt.
- Kies een bestand met de muzieknoot-knop. Dat geldt alleen voor de huidige sessie.

## Bestanden

Alles zit in één bestand, `ai-revolution-wait-but-why.html`, met in volgorde:

- een `<style>`-blok met de opmaak;
- de pagina met overlays en bediening;
- een eerste `<script>` met de scènes (tekst en weetjes in `SCENES`), het tekenwerk en de tijdlijn;
- een tweede `<script>` met de score (`SCORE`) en de synthese met Web Audio.

### Aanpassen

- **Tekst van een scène**: pas het betreffende item in `SCENES` aan (`title`, `txt`, `fact` en de tijdmarkeringen in `marks`).
- **Duur per scène**: `DUR` in het eerste script (in seconden). De muziek past zich vanzelf aan.
- **Muziek per scène**: akkoorden, intensiteit, sequencer, melodie en klappen staan in `SCORE` in het tweede script, één regel per scène. Het thema staat in `THEME`.

## Bron

Tim Urban, *The AI Revolution: The Road to Superintelligence* en *The AI Revolution: Our Immortality or Extinction*, waitbutwhy.com, 2015. De teksten in de animatie zijn een eigen Nederlandse samenvatting.
