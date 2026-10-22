const JICIN = [50.437, 15.3516];
const map = L.map('map', { preferCanvas: true }).setView(JICIN, 13);
const renderer = L.canvas({ padding: 0.5 });
const parcelLayer = L.layerGroup().addTo(map);
const status = document.getElementById('status');
let requestController = null;
let requestNumber = 0;
let requestTimer = null;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// S-JTSK / Krovak East North as published by ČÚZK.
proj4.defs('EPSG:5514',
    '+proj=krovak +lat_0=49.5 +lon_0=24.83333333333333 +alpha=30.28813972222222 ' +
    '+k=0.9999 +x_0=0 +y_0=0 +ellps=bessel +towgs84=570.69,85.69,462.84,4.998,1.586,5.261,3.56 ' +
    '+units=m +no_defs');

function projectToCzech([longitude, latitude]) {
    return proj4('EPSG:4326', 'EPSG:5514', [longitude, latitude]);
}

function projectToWgs84([x, y]) {
    return proj4('EPSG:5514', 'EPSG:4326', [x, y]);
}

function transformCoordinates(coordinates) {
    if (typeof coordinates[0] === 'number') {
        const [longitude, latitude] = projectToWgs84(coordinates);
        return [latitude, longitude];
    }
    return coordinates.map(transformCoordinates);
}

function formatArea(feature) {
    if (!feature.geometry) return '—';
    const ring = feature.geometry.coordinates[0];
    let area = 0;
    for (let i = 0; i < ring.length - 1; i += 1) {
        const [x1, y1] = ring[i];
        const [x2, y2] = ring[i + 1];
        area += (x1 * y2) - (x2 * y1);
    }
    return `${(Math.abs(area) / 2).toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} m²`;
}

function showFeature(feature) {
    const props = feature.properties || {};
    const id = props.id ?? feature.id ?? 'neuvedeno';
    const popup = document.createElement('div');
    popup.className = 'parcel-popup';
    const heading = document.createElement('h2');
    heading.textContent = 'Informace o parcele';
    const details = document.createElement('dl');
    [
        ['ID', String(id)],
        ['Plocha mapy', formatArea(feature)],
        ['Zdroj', 'ČÚZK WFS']
    ].forEach(([label, value]) => {
        const term = document.createElement('dt');
        term.textContent = label;
        const description = document.createElement('dd');
        description.textContent = value;
        details.append(term, description);
    });
    popup.append(heading, details);
    return popup;
}

function drawFeature(feature) {
    if (!feature.geometry) return;
    const coordinates = transformCoordinates(feature.geometry.coordinates);
    const layer = L.polygon(coordinates, {
        color: '#2357a6',
        fillColor: '#5f9eea',
        fillOpacity: 0.08,
        weight: 1,
        renderer
    });
    layer.bindPopup(() => showFeature(feature));
    layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.28, weight: 2 }));
    layer.on('mouseout', () => layer.setStyle({ fillOpacity: 0.08, weight: 1 }));
    parcelLayer.addLayer(layer);
}

function setStatus(text, error = false) {
    status.textContent = text;
    status.classList.toggle('error', error);
}

async function loadParcels() {
    if (map.getZoom() < 12) {
        parcelLayer.clearLayers();
        setStatus('Přibližte mapu pro načtení parcel');
        return;
    }
    if (requestController) requestController.abort();
    requestController = new AbortController();
    const currentRequest = ++requestNumber;
    const bounds = map.getBounds();
    const southWest = projectToCzech([bounds.getWest(), bounds.getSouth()]);
    const northEast = projectToCzech([bounds.getEast(), bounds.getNorth()]);
    const params = new URLSearchParams({
        minX: Math.min(southWest[0], northEast[0]).toFixed(2),
        minY: Math.min(southWest[1], northEast[1]).toFixed(2),
        maxX: Math.max(southWest[0], northEast[0]).toFixed(2),
        maxY: Math.max(southWest[1], northEast[1]).toFixed(2)
    });

    setStatus('Načítám parcely…');
    try {
        const response = await fetch(`api/parcels.php?${params}`, { signal: requestController.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Načtení dat selhalo.');
        if (currentRequest !== requestNumber) return;
        parcelLayer.clearLayers();
        payload.features.forEach(drawFeature);
        setStatus(`${payload.features.length.toLocaleString('cs-CZ')} parcel`);
    } catch (error) {
        if (error.name === 'AbortError') return;
        setStatus(error.message, true);
    }
}

function scheduleLoad() {
    clearTimeout(requestTimer);
    requestTimer = setTimeout(loadParcels, 250);
}

map.on('moveend', scheduleLoad);
loadParcels();
