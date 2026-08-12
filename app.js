// Euer fertiger CSV-Link aus Google Sheets
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQFDiufFtP3EnpKNdGI6f8Kk1HaZoEzUCC79DnLdtqOSkzzs0eejgEypkw23MzIbyM4be4G63yGhhuN/pub?output=csv';

let map;
let allMarkers = [];

function initMap() {
    // Zentriere die Karte auf Deutschland
    map = L.map('map').setView([51.1657, 10.4515], 6);

    // Karten-Design laden (OpenStreetMap/CartoDB)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap & CartoDB',
        maxZoom: 18
    }).addTo(map);

    loadSheetData();
}

function loadSheetData() {
    Papa.parse(GOOGLE_SHEET_CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            processData(results.data);
        },
        error: function(err) {
            console.error("Fehler beim Laden der Daten aus Google Sheets:", err);
        }
    });
}

// Ermittelt den Bedarf basierend auf euren Spalten
function getBedarfStatus(row) {
    const vklHeavy = row['VKL Heavy'] ? row['VKL Heavy'].trim().toLowerCase() : '';
    const kapazitaetLight = row['Kapazität im light Bereich (inkl. SMR)'] ? row['Kapazität im light Bereich (inkl. SMR)'].trim().toLowerCase() : '';

    if (vklHeavy === 'ja' && (kapazitaetLight === 'ja' || (kapazitaetLight !== '0' && kapazitaetLight !== ''))) {
        return 'Genereller Bedarf';
    } else if (vklHeavy === 'ja') {
        return 'Nur Heavy';
    } else if (kapazitaetLight === 'ja' || (kapazitaetLight !== '0' && kapazitaetLight !== '')) {
        return 'Kein Heavy';
    } else {
        return 'Kein Bedarf';
    }
}

// Farbschema festlegen
function getColor(status) {
    switch (status) {
        case 'Genereller Bedarf': return '#e74c3c'; // Rot
        case 'Nur Heavy':        return '#e67e22'; // Orange
        case 'Kein Heavy':       return '#3498db'; // Blau
        case 'Kein Bedarf':      return '#2ecc71'; // Grün
        default:                 return '#95a5a6'; // Grau
    }
}

function processData(data) {
    data.forEach(row => {
        // Splittet eure Spalte "Lat.Long." am Komma
        const coordsRaw = row['Lat.Long.'];
        
        if (coordsRaw && coordsRaw.includes(',')) {
            const coords = coordsRaw.split(',');
            const lat = parseFloat(coords[0].trim());
            const lng = parseFloat(coords[1].trim());

            if (!isNaN(lat) && !isNaN(lng)) {
                const bedarfStatus = getBedarfStatus(row);
                const color = getColor(bedarfStatus);

                // Marker erstellen
                const marker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: color,
                    color: "#ffffff",
                    weight: 1.5,
                    opacity: 1,
                    fillOpacity: 0.85
                });

                // Inhalts-Box beim Klick auf den Marker
                const popupContent = `
                    <div style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.4;">
                        <h4 style="margin: 0 0 6px 0; color: #2c3e50;">${row['Ort'] || 'Unbekannt'} (${row['PLZ'] || ''})</h4>
                        <b>Netzkennung:</b> ${row['Netzkennung'] || 'N/A'}<br>
                        <b>Status:</b> ${row['BUStatus'] || 'N/A'}<br>
                        <b>Straße:</b> ${row['Straße'] || 'N/A'}<br>
                        <hr style="border:0; border-top:1px solid #ccc; margin: 6px 0;">
                        <b>Bedarfseinstufung:</b> <span style="color:${color}; font-weight:bold;">${bedarfStatus}</span><br>
                        <b>VKL Heavy:</b> ${row['VKL Heavy'] || 'Nein'}<br>
                        <b>Kapazität Light:</b> ${row['Kapazität im light Bereich (inkl. SMR)'] || 'N/A'}
                    </div>
                `;
                marker.bindPopup(popupContent);

                allMarkers.push({
                    marker: marker,
                    status: bedarfStatus
                });

                marker.addTo(map);
            }
        }
    });
}

// Filterfunktion für die Checkboxen
function filterMap() {
    const checkboxes = document.querySelectorAll('.filter-container input[type="checkbox"]');
    const activeFilters = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    allMarkers.forEach(item => {
        if (activeFilters.includes(item.status)) {
            map.addLayer(item.marker);
        } else {
            map.removeLayer(item.marker);
        }
    });
}

window.onload = initMap;
