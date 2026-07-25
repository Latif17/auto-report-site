const culpritSites = [
    { name: 'ReFood UK (Saria Ltd)', category: 'Rubbish/refuse', lat: 51.514, lng: 0.153 },
    { name: 'East London BioGas (TEG Biogas)', category: 'Rubbish/refuse', lat: 51.514, lng: 0.155 },
    { name: 'Veolia Plastics', category: 'Chemical/plastic', lat: 51.521185, lng: 0.136934 },
    { name: 'Beckton Sewage Treatment Works', category: 'Sewage', lat: 51.524357, lng: 0.078019 },
    { name: 'Crossness Sewage Treatment Works', category: 'Sewage', lat: 51.506562, lng: 0.135472 },
    { name: 'Riverside Sewage Treatment Works', category: 'Sewage', lat: 51.518307, lng: 0.185737 }
];

const barkingRiverside = { lat: 51.5203, lng: 0.1017 };

function initCulpritMap() {
    const mapEl = document.getElementById('culprit-map');
    if (!mapEl || typeof L === 'undefined') return;

    const map = L.map('culprit-map').setView([barkingRiverside.lat, barkingRiverside.lng], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const homeIcon = L.divIcon({ className: 'map-pin map-pin--home', html: '&#9679;', iconSize: [16, 16] });
    L.marker([barkingRiverside.lat, barkingRiverside.lng], { icon: homeIcon })
        .addTo(map)
        .bindPopup('<strong>Barking Riverside</strong><br>Affected area');

    const siteIcon = L.divIcon({ className: 'map-pin map-pin--site', html: '&#9679;', iconSize: [16, 16] });
    culpritSites.forEach((site) => {
        L.marker([site.lat, site.lng], { icon: siteIcon })
            .addTo(map)
            .bindPopup(`<strong>${site.name}</strong><br>${site.category}`);
    });
}

document.addEventListener('DOMContentLoaded', initCulpritMap);
