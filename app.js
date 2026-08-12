// Euer fertiger CSV-Link aus Google Sheets
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQFDiufFtP3EnpKNdGI6f8Kk1HaZoEzUCC79DnLdtqOSkzzs0eejgEypkw23MzIbyM4be4G63yGhhuN/pub?output=csv';

let map;
let allMarkers = [];

function initMap() {
    // 1. Karte initialisieren und auf Deutschland ausrichten
    map = L.map('map', {
        zoomControl: true
    }).setView([51.1657, 10.4515], 6);

    // 2. Interaktive Kartenkacheln laden (OpenStreetMap CartoDB Light)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // 3. Daten laden
    loadSheetData();
}

function loadSheetData() {
    Papa.parse(GOOGLE_SHEET_CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            console.log("Geladene Daten:", results.data);
            processData(results.data);
        },
        error: function(err) {
            console.error("Fehler beim Laden der Daten aus Google Sheets:", err);
            alert("Fehler beim Laden der Tabellendaten. Bitte prüfe den Google Sheet Link.");
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

// Farbzuordnung festlegen
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
    let validCoordinatesCount = 0;

    data.forEach(row => {
        // Splittet eure Spalte "Lat.Long." am Komma
        const coordsRaw = row['Lat.Long.'];
        
        if (coordsRaw && coordsRaw.includes(',')) {
            const coords = coordsRaw.split(',');
            const lat = parseFloat(coords[0].trim());
            const lng = parseFloat(coords[1].trim());

            if (!isNaN(lat) && !isNaN(lng)) {
                validCoordinatesCount++;
                const bedarfStatus = getBedarfStatus(row);
                const color = getColor(bedarfStatus);

                // Interaktiver Kreis-Marker
                const marker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: color,
                    color: "#ffffff",
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.85
                });

                // Detail-Popup beim Klick
                const popupContent = `
                    <div style="font-family: Arial, sans-serif; font-size: 13px;">
                        <h4 style="margin: 0 0 6px 0; color: #2c3e50; font-size: 15px;">${row['Ort'] || 'Unbekannt'} (${row['PLZ'] || ''})</h4>
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                            <tr><td style="padding: 2px 0;"><b>Netzkennung:</b></td><td>${row['Netzkennung'] || 'N/A'}</td></tr>
                            <tr><td style="padding: 2px 0;"><b>Status:</b></td><td>${row['BUStatus'] || 'N/A'}</td></tr>
                            <tr><td style="padding: 2px 0;"><b>Straße:</b></td><td>${row['Straße'] || 'N/A'}</td></tr>
                        </table>
                        <hr style="border:0; border-top:1px solid #eee; margin: 8px 0;">
                        <b>Bedarfseinstufung:</b> <span style="color:${color}; font-weight:bold;">${bedarfStatus}</span><br>
                        <small style="color: #7f8c8d;">VKL Heavy: ${row['VKL Heavy'] || 'Nein'} | Light: ${row['Kapazität im light Bereich (inkl. SMR)'] || 'N/A'}</small>
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

    console.log(`Erfolgreich ${validCoordinatesCount} Standorte auf der Karte platziert.`);
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

// Karte erst starten, wenn das HTML vollständig geladen ist
document.addEventListener("DOMContentLoaded", initMap);
