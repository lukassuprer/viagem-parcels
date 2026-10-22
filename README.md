# Parcely okresu Jičín

Malá webová aplikace pro prohlížení katastrálních parcel nad mapou. Aplikace
využívá oficiální WFS službu ČÚZK pro INSPIRE téma **Cadastral Parcels**:
`https://services.cuzk.cz/wfs/inspire-cp-wfs.asp`.

## Spuštění

Požadavky:

- PHP 8.1 nebo novější,
- internetové připojení (mapové dlaždice OSM a WFS ČÚZK),
- moderní Chrome nebo Firefox.

```bash
php -S localhost:8080 -t public
```

Otevřete <http://localhost:8080>.

## Rozhodnutí a důvody

- **ČÚZK WFS místo předem staženého souboru:** Zadání vyžaduje práci s
  katastrálními daty a WFS je oficiální zdroj. Aplikace tak nemusí distribuovat
  velký datový soubor a vždy načte aktuální data.
- **PHP proxy:** Prohlížeč volá vlastní endpoint aplikace, ne ČÚZK přímo.
  Backend tím řeší CORS, validaci rozsahu, timeout a jednoduchou diskovou cache.
- **Viewport loading:** Parcely se načítají až pro aktuální výřez mapy. Dotaz je
  omezen na 7 km v obou směrech a nejvýše 15 000 prvků. Tím se nezpracovává
  celý okres najednou a aplikace zůstává použitelná i při posouvání mapy.
- **EPSG:5514:** WFS používá český souřadnicový systém S-JTSK / Krovak East
  North. Frontend transformuje geometrii do WGS84 pro Leaflet pomocí `proj4`.
- **Canvas renderer:** Leaflet kreslí velké množství polygonů na canvas, což je
  levnější než samostatný DOM/SVG element pro každý polygon.

Zvolený výchozí rozsah kolem Jičína pokrývá katastrální území města i okolní
katastrální území. Přesné hranice se načítají podle viewportu z ČÚZK; aplikace
nepředstírá vlastnosti, které zdrojová WFS služba neposkytuje. Kliknutí zobrazuje
identifikátor prvku, plochu vypočtenou z geometrie a zdroj dat.

## Co bych doplnil s více časem

- načtení názvu a kódu katastrálního území přes vrstvu `CadastralZoning`,
- robustnější převod souřadnic na backendu nebo předgenerované vektorové dlaždice,
- testy PHP endpointu (validace bboxu, cache a chybové odpovědi),
- observabilitu (logování latence a počtu prvků) a rate limit proxy,
- detail z Nahlížení do KN, pokud by pro něj existovalo stabilní a povolené
  veřejné rozhraní.

## Známé kompromisy

WFS vrstva publikovaná ČÚZK vrací pro parcelu v GeoJSONu především technické
vlastnosti a geometrii. Proto detail zobrazuje bezpečně dostupné informace a
neinterpretuje technické ID jako parcelní číslo. Pro produkční aplikaci by bylo
vhodné doplnit autorizovaný zdroj atributových údajů.
