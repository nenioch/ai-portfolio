# Glijbaan Gekte

3D bootrace in een reuzenwaterglijbaan, gebouwd met three.js (r128, via cdnjs). Alles staat in één bestand: `index.html`.

## Spelen
Open `index.html` in de browser. Je hebt internet nodig, want three.js wordt van het CDN geladen.

| Toets | Actie |
|---|---|
| ← → / A D | Sturen (ook tijdens de geiser-vlucht) |
| ↑ / W | Gas |
| ↓ / S | Remmen |
| Spatie / Shift | Turbo |
| M | Geluid aan/uit |
| N | Muziek aan/uit |

Tijdens de race speelt een funky deuntje in Mario Kart-stijl (`SONG` in `index.html`, 152 BPM, alles gegenereerd met WebAudio). Je hoort synth-brass, koperstoten, slapbas en swing, en de laatste keer gaat het een toon omhoog. In de disco-tunnel wordt het zachter en neemt de disco-beat het over.

Op een touchscreen verschijnen knoppen in beeld.

## De baan
- Een brede glijbaan met een halve-pijp-profiel begint op een gestreepte toren. De route is een rondgang: S-bochten, een grote U-bocht naar rechts, terug door de disco, de spiraal, en dan onder de baan door terug naar de toren. Alle bochten hebben kombochten. Ga je hard de bocht door, dan glijd je tegen de wand op.
- De route staat in `SEGMENTS` in `index.html`: lengte, bocht en helling per stuk. Baandelen die over elkaar lopen liggen minstens 16 eenheden boven of onder elkaar. De baan moet eindigen recht achter de starttoren, met de neus richting start. Als je de route verandert, moet dat zo blijven.
- **Disco-tunnel**: ongeveer van 34% tot 53% van de baan wordt het donker. Je ziet een lichtgevende dansvloer, knipperende lampjes, discoballen, stroboscoop en een beat van 124 BPM.
- **Spiraal**: direct na de disco draai je in 1,5 krappe slag linksom naar beneden. De baan helt daar sterk en de buitenkant trekt aan je. Op de buitenkant liggen boost-pijlen en één strandbal.
- **Geiser-kanon**: het plonsbad ligt recht achter de starttoren. Je glijdt rechtdoor naar de geiser in het midden, en de waterstraal blaast je in één boog vooruit naar het startplatform. Stuur tijdens de vlucht door de gouden ring, dan krijg je een volle turbo en een snellere start.
- **Minikaart** rechtsboven: wit is de gewone baan, roze de disco en geel de spiraal. Het groene vierkantje is de start, het blauwe rondje het plonsbad, en de gekleurde stippen zijn de boten. Jouw boot heeft een witte rand.
- Gele pijlen geven een boost. Strandballen remmen je af.

3 rondes en 3 tegenstanders (Spetter, Bubbel, Plons). De finish ligt bij het plonsbad, na de laatste ronde.
