const URL_PPS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTf1QfkAclUHFpdAYZ87d6UUu71mPGF4VLJ83jfWw01Sazmf95hx9lKBq8SYj3rBnuSOWDLat9Ojht6/pub?gid=1321416036&single=true&output=csv';
let publicPPSData = [];
let map;
let markersGroup;

// Fetch live PPS data
Papa.parse(URL_PPS, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
        publicPPSData = results.data.map(d => ({
            name: d.PPS || '',
            district: d.Daerah || '',
            zon: d.Zon || '',
            parlimen: d.Parlimen || '',
            dun: d.DUN || '',
            jenis: d.Jenis || '',
            kapasiti: parseInt(d.Kapasiti) || 0,
            statusLawatan: d.Status_Lawatan_PKD_2026 || d.Status || 'Belum Dilawati',
            statusFungsi: d.Status_Fungsi_Semasa || d.fungsi || 'Tidak Aktif',
            lat: parseFloat(d.Latitude) || null,
            lng: parseFloat(d.Longitude) || null
        })).filter(d => d.name !== '');
        
        console.log("Loaded Public PPS Data:", publicPPSData.length, "facilities");
        
        initDashboard();
    }
});

function initDashboard() {
    // Hide loader, show content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('dashboard-content').style.display = 'block';

    // Set Last Updated Time
    const now = new Date();
    document.getElementById('lastUpdated').innerText = now.toLocaleString('en-MY', { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
    });

    populateFilters();
    updateScorecards();
    initMap();
    renderTable();
}

function updateScorecards() {
    const total = publicPPSData.length;
    const active = publicPPSData.filter(d => d.statusFungsi.toLowerCase() === 'aktif').length;
    const verified = publicPPSData.filter(d => d.statusLawatan === 'Telah Dilawati').length;
    const ppd = publicPPSData.filter(d => d.jenis.toLowerCase().includes('sekolah')).length;

    document.getElementById('score-total').innerText = total;
    document.getElementById('score-active').innerText = active;
    document.getElementById('score-verified').innerText = verified;
    document.getElementById('score-ppd').innerText = ppd;
}

function initMap() {
    // Default center for Kedah
    map = L.map('map').setView([6.1184, 100.3685], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
    }).addTo(map);
    markersGroup = L.layerGroup().addTo(map);
}

function populateFilters() {
    const districtFilter = document.getElementById('districtFilter');
    const dunFilter = document.getElementById('dunFilter');
    const jenisFilter = document.getElementById('jenisFilter');

    const districts = [...new Set(publicPPSData.map(d => d.district))].filter(Boolean).sort();
    districts.forEach(dist => {
        const option = document.createElement('option');
        option.value = dist;
        option.text = dist;
        districtFilter.appendChild(option);
    });

    const duns = [...new Set(publicPPSData.map(d => d.dun))].filter(Boolean).sort();
    duns.forEach(dun => {
        const option = document.createElement('option');
        option.value = dun;
        option.text = dun;
        dunFilter.appendChild(option);
    });

    const types = [...new Set(publicPPSData.map(d => d.jenis))].filter(Boolean).sort();
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.text = type;
        jenisFilter.appendChild(option);
    });
}

function renderTable() {
    const tbody = document.getElementById('ppsTableBody');
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const distFilter = document.getElementById('districtFilter').value;
    const dunFilter = document.getElementById('dunFilter').value;
    const jenisFilter = document.getElementById('jenisFilter').value;
    const statFilter = document.getElementById('statusFilter').value;

    tbody.innerHTML = '';

    const filteredData = publicPPSData.filter(pps => {
        const matchesSearch = pps.name.toLowerCase().includes(searchInput);
        const matchesDist = distFilter === 'All' || pps.district === distFilter;
        const matchesDun = dunFilter === 'All' || pps.dun === dunFilter;
        const matchesJenis = jenisFilter === 'All' || pps.jenis === jenisFilter;
        const matchesStat = statFilter === 'All' || pps.statusFungsi.toLowerCase() === statFilter.toLowerCase();
        
        return matchesSearch && matchesDist && matchesDun && matchesJenis && matchesStat;
    });

    if (markersGroup) {
        markersGroup.clearLayers();
    }

    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 3rem; color: var(--text-muted);">Tiada PPS dijumpai untuk carian ini.</td></tr>';
        return;
    }

    let rowsHtml = '';
    const newMarkers = [];

    filteredData.forEach(pps => {
        // Operational Badge
        let opBadge = '';
        if (pps.statusFungsi.toLowerCase() === 'aktif') {
            opBadge = `<span class="badge badge-active">🟢 AKTIF</span>`;
        } else {
            opBadge = `<span class="badge badge-inactive">🔴 TUTUP</span>`;
        }

        const coords = (pps.lat && pps.lng) ? `<a href="https://www.google.com/maps/search/?api=1&query=${pps.lat},${pps.lng}" class="map-btn" target="_blank">🗺️ Buka Peta</a>` : '<span style="color: var(--text-muted); font-size: 0.85rem;">Koordinat Tiada</span>';

        rowsHtml += `
            <tr>
                <td><div class="facility-name">${pps.name}</div></td>
                <td>
                    <div style="font-size: 0.85rem;"><strong>Daerah:</strong> ${pps.district}</div>
                    <div style="font-size: 0.85rem;"><strong>Zon:</strong> ${pps.zon}</div>
                    <div style="font-size: 0.85rem;"><strong>Parlimen:</strong> ${pps.parlimen}</div>
                    <div style="font-size: 0.85rem; color: var(--primary);"><strong>DUN:</strong> ${pps.dun}</div>
                </td>
                <td>${pps.jenis}</td>
                <td style="font-weight: 600; text-align: center;">${pps.kapasiti}</td>
                <td>${opBadge}</td>
                <td>${coords}</td>
            </tr>
        `;

        // Add to Map Array
        if (pps.lat && pps.lng) {
            const markerColor = pps.statusFungsi.toLowerCase() === 'aktif' ? '#10b981' : '#ef4444';
            const marker = L.circleMarker([pps.lat, pps.lng], {
                color: markerColor,
                fillColor: markerColor,
                fillOpacity: 0.8,
                radius: 8,
                weight: 2
            });
            
            const popupContent = `
                <div style="font-family: 'Inter', sans-serif;">
                    <h4 style="margin: 0 0 5px 0; color: var(--primary);">${pps.name}</h4>
                    <p style="margin: 0; font-size: 0.85rem;"><strong>Daerah:</strong> ${pps.district}</p>
                    <p style="margin: 0; font-size: 0.85rem;"><strong>Jenis:</strong> ${pps.jenis}</p>
                    <p style="margin: 0; font-size: 0.85rem;"><strong>Status:</strong> ${pps.statusFungsi}</p>
                </div>
            `;
            marker.bindPopup(popupContent);
            newMarkers.push(marker);
        }
    });

    // Write to DOM exactly once (HUGE performance boost)
    tbody.innerHTML = rowsHtml;

    // Add markers in bulk
    if (newMarkers.length > 0) {
        const group = L.layerGroup(newMarkers);
        group.addTo(markersGroup);
        map.fitBounds(L.featureGroup(newMarkers).getBounds(), { padding: [30, 30], maxZoom: 14 });
    }

    renderChart(filteredData);
    renderApaTable(filteredData);
}

let ppsChartInstance = null;
let jenisPieChartInstance = null;
let daerahDunPieChartInstance = null;

function renderChart(data) {
    const ctxBar = document.getElementById('ppsChart').getContext('2d');
    const ctxJenis = document.getElementById('jenisPieChart').getContext('2d');
    const ctxDaerahDun = document.getElementById('daerahDunPieChart').getContext('2d');
    const distFilter = document.getElementById('districtFilter').value;
    
    // 1. Stacked Bar Chart (District & Status)
    const districtStats = {};
    data.forEach(d => {
        if (!districtStats[d.district]) {
            districtStats[d.district] = { aktif: 0, tutup: 0 };
        }
        if (d.statusFungsi.toLowerCase() === 'aktif') {
            districtStats[d.district].aktif++;
        } else {
            districtStats[d.district].tutup++;
        }
    });

    const labelsBar = Object.keys(districtStats).sort();
    const dataAktif = labelsBar.map(l => districtStats[l].aktif);
    const dataTutup = labelsBar.map(l => districtStats[l].tutup);

    if (ppsChartInstance) ppsChartInstance.destroy();
    ppsChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: labelsBar,
            datasets: [
                { label: 'Aktif', data: dataAktif, backgroundColor: '#10b981', borderRadius: 4 },
                { label: 'Tutup / Tidak Aktif', data: dataTutup, backgroundColor: '#ef4444', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { stepSize: 5 } } },
            plugins: { legend: { position: 'top' } }
        }
    });

    // 2. Jenis Pie Chart
    const jenisStats = {};
    data.forEach(d => {
        const jenis = d.jenis || 'Lain-lain';
        jenisStats[jenis] = (jenisStats[jenis] || 0) + 1;
    });
    
    if (jenisPieChartInstance) jenisPieChartInstance.destroy();
    jenisPieChartInstance = new Chart(ctxJenis, {
        type: 'doughnut',
        data: {
            labels: Object.keys(jenisStats),
            datasets: [{
                data: Object.values(jenisStats),
                backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } }
    });

    // 3. Daerah/DUN Pie Chart
    const locStats = {};
    const useDun = distFilter !== 'All';
    
    document.getElementById('daerahDunTitle').innerText = useDun 
        ? `Taburan PPS Mengikut DUN (Daerah: ${distFilter})` 
        : `Taburan PPS Mengikut Daerah`;

    data.forEach(d => {
        const loc = useDun ? (d.dun || 'Tiada Maklumat') : (d.district || 'Tiada Maklumat');
        locStats[loc] = (locStats[loc] || 0) + 1;
    });

    if (daerahDunPieChartInstance) daerahDunPieChartInstance.destroy();
    daerahDunPieChartInstance = new Chart(ctxDaerahDun, {
        type: 'pie',
        data: {
            labels: Object.keys(locStats),
            datasets: [{
                data: Object.values(locStats),
                backgroundColor: ['#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#ef4444', '#14b8a6', '#64748b', '#f97316', '#0ea5e9']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } }
    });
}

function renderApaTable(data) {
    const tbody = document.getElementById('apaTableBody');
    const tfoot = document.getElementById('apaTableFoot');
    tbody.innerHTML = '';
    tfoot.innerHTML = '';

    const stats = {};
    let totalPPS = 0, totalCap = 0, totalActive = 0, totalSchool = 0;

    data.forEach(d => {
        if (!stats[d.district]) {
            stats[d.district] = { count: 0, cap: 0, active: 0, school: 0 };
        }
        stats[d.district].count++;
        stats[d.district].cap += (d.kapasiti || 0);
        if (d.statusFungsi.toLowerCase() === 'aktif') stats[d.district].active++;
        if (d.jenis.toLowerCase().includes('sekolah')) stats[d.district].school++;
        
        totalPPS++;
        totalCap += (d.kapasiti || 0);
        if (d.statusFungsi.toLowerCase() === 'aktif') totalActive++;
        if (d.jenis.toLowerCase().includes('sekolah')) totalSchool++;
    });

    Object.keys(stats).sort().forEach(dist => {
        const activePct = stats[dist].count > 0 ? ((stats[dist].active / stats[dist].count) * 100).toFixed(1) : "0.0";
        const schoolPct = stats[dist].count > 0 ? ((stats[dist].school / stats[dist].count) * 100).toFixed(1) : "0.0";

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: left;">${dist}</td>
            <td>${stats[dist].count}</td>
            <td>${stats[dist].cap.toLocaleString()}</td>
            <td>${stats[dist].active} (${activePct}%)</td>
            <td>${stats[dist].school} (${schoolPct}%)</td>
        `;
        tbody.appendChild(tr);
    });

    if (totalPPS > 0) {
        const totalActivePct = totalPPS > 0 ? ((totalActive / totalPPS) * 100).toFixed(1) : "0.0";
        const totalSchoolPct = totalPPS > 0 ? ((totalSchool / totalPPS) * 100).toFixed(1) : "0.0";

        const footTr = document.createElement('tr');
        footTr.innerHTML = `
            <td style="text-align: left; font-weight: bold;">Total</td>
            <td style="font-weight: bold;">${totalPPS}</td>
            <td style="font-weight: bold;">${totalCap.toLocaleString()}</td>
            <td style="font-weight: bold;">${totalActive} (${totalActivePct}%)</td>
            <td style="font-weight: bold;">${totalSchool} (${totalSchoolPct}%)</td>
        `;
        tfoot.appendChild(footTr);
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Event Listeners
document.getElementById('searchInput').addEventListener('input', debounce(renderTable, 300));
document.getElementById('districtFilter').addEventListener('change', renderTable);
document.getElementById('dunFilter').addEventListener('change', renderTable);
document.getElementById('jenisFilter').addEventListener('change', renderTable);
document.getElementById('statusFilter').addEventListener('change', renderTable);
