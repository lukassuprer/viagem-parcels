<!doctype html>
<html lang="cs">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Parcely okresu Jičín</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
<header class="toolbar">
    <div>
        <h1>Parcely okresu Jičín</h1>
        <p>Interaktivní mapa katastrálních parcel z dat ČÚZK</p>
    </div>
    <div id="status" class="status" role="status">Načítám data…</div>
</header>
<main id="map" aria-label="Mapa parcel"></main>
<aside id="help" class="help">
    <strong>Jak mapu používat</strong>
    <span>Přibližte mapu a klikněte na parcelu pro zobrazení detailu.</span>
</aside>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/proj4@2.12.1/dist/proj4-src.js"></script>
<script src="app.js"></script>
</body>
</html>
