# Rooi Harten Kart

Een simpele kartrace in de stijl van Mario Kart, rond en dwars door het
Missiehuis van het Heilig Hart ("de Rooi Harten"), Bredaseweg 204, Tilburg.

## Spelen

**Dubbelklik `rooi-harten-kart.html`.** Je hebt internet nodig, want Three.js
komt van een CDN.

| Actie | Toets |
| --- | --- |
| Gas / rem, achteruit | `↑` `↓` of `W` `S` |
| Sturen | `←` `→` of `A` `D` |
| Driften (lang driften = turbo) | `Spatie` of `Shift` |
| Item gebruiken (paddenstoel of banaan) | `E` of `X` |
| Terug op de baan | `R` |
| Camera (achter, ver, achteruit) | `C` |
| Pauze | `P` of `Esc` |

Je rijdt drie rondes tegen Pater Jan, Broeder Kees en Zuster Anna.

**Op een telefoon of tablet** houd je het toestel liggend. Je stuurt door je
duim op het scherm te zetten en opzij te schuiven. Rechts onder zitten gas,
driften (geeft ook gas) en je item, links onder de rem, rechts boven pauze.

## Het parcours

1. Start op de Bredaseweg voor de hoofdingang, dan westwaarts langs de gevel.
2. Door een **zijpoortje** in het hek naar de westkant van het klooster, door
   een **zijdeur** in het westelijke hoekblok en door de **zijgang** onder de
   westvleugel naar de **ontvangsthal**.
3. De **grote bordestrap** in de oostvleugel op.
4. Door de **hal op de eerste verdieping** in de toren.
5. De **zoldertrap** in de westvleugel op.
6. Over de **zolder** naar de **zolderkamer**, en **door de dakkapel naar buiten**.
7. Met een sprong van 11,7 m de binnenplaats op, door de kloostertuin, langs
   de nieuwbouw en door de oostpoort terug naar de Bredaseweg.

## Waar het klooster vandaan komt

Het klooster, de kapel en het terrein komen rechtstreeks uit
`..\rooi-harten-tilburg-3d` (de modules `textures.js`, `plan.js`, `kit.js`,
`klooster.js`, `kapel.js` en `exterior.js`). Dat project wordt niet aangepast.

Het hoofdgebouw is daar massief gemodelleerd, zonder interieur. De hal, de
trappen, de zolder en de kamer zijn voor dit spel bedacht (`src/interior.js`).
Ze staan binnen de muren van het model. Waar de baan door de schil gaat (de
zijdeur, waar het onderste venster in de westgevel van het hoekblok een deur
wordt, en de dakkapel) wordt het model in de shader weggesneden
(`src/cut.js`). Hetzelfde gebeurt met één hekvak aan de westkant (het
zijpoortje) en één haagstuk voor het oostelijke hoekblok.

## Aanpassen

De bron staat in `src/` als losse ES-modules, met `index.html` als sjabloon.
Na een wijziging maak je het speelbare bestand opnieuw:

```powershell
.\build.ps1
```

| Bestand | Rol |
| --- | --- |
| `src/route.js` | De baan als punten (x, y, z, breedte, binnen/sprong/zone), en het bemonsteren daarvan |
| `src/track.js` | Baanstrook, kerbs, startboog, boostpads, itemblokken, plaatsbepaling |
| `src/interior.js` | Het binnenwerk en de uitsnijdozen |
| `src/cut.js` | Gaten in het model (shader) en in de botsingsboxen |
| `src/kart.js` | Kartmodel en arcade-fysica |
| `src/ai.js` | De computertegenstanders |
| `src/game.js` | Scène, race, camera, HUD, minimap |

Achter de bestandsnaam kun je een `#` zetten:

| Achtervoegsel | Effect |
| --- | --- |
| `#test` | Race zonder beeld met vier computerkarts, plus een baancontrole; het rapport komt als JSON in beeld |
| `#view=13` | Vast beeld vanaf punt 13 van de baan (zie `ROUTE` in `src/route.js`) |
| `#cam=x,y,z,tx,ty,tz` | Vast beeld vanaf een vrije camerapositie |
