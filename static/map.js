(() => {
  const mapNode = document.getElementById('care-map');
  const status = document.getElementById('location-status');
  if (mapNode && window.L) {
    const center = JSON.parse(document.getElementById('map-center').textContent);
    const data = JSON.parse(document.getElementById('map-markers').textContent);
    const map = L.map(mapNode, {scrollWheelZoom: false}).setView(center, 12);
    const layer = L.tileLayer(mapNode.dataset.tileUrl, {maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).addTo(map);
    layer.on('tileerror', () => { status.textContent = 'Some map tiles could not load. Provider details and directions remain available in the list.'; });
    const markers = new Map();
    data.forEach(p => {
      const popup = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = p.name;
      const label = document.createElement('p'); label.textContent = p.category;
      const link = document.createElement('a'); link.textContent = 'View care details →'; link.href = `/providers/${p.id}/`;
      popup.append(title, label, link);
      const icon = L.divIcon({className: 'care-marker', html: '<span aria-hidden="true">✣</span>', iconSize: [36, 36], iconAnchor: [18, 18]});
      const marker = L.marker([p.lat, p.lon], {icon, title: p.name}).addTo(map).bindPopup(popup);
      marker.on('click', () => {
        document.querySelectorAll('.provider-card').forEach(c => c.classList.remove('selected'));
        document.getElementById(`provider-${p.id}`)?.classList.add('selected');
      });
      markers.set(String(p.id), marker);
    });
    document.querySelectorAll('.map-focus').forEach(button => button.addEventListener('click', () => {
      const marker = markers.get(button.dataset.id);
      if (marker) { map.setView(marker.getLatLng(), 15); marker.openPopup(); mapNode.scrollIntoView({behavior: 'smooth', block: 'center'}); }
    }));
  } else if (mapNode) { mapNode.textContent = 'Map unavailable. Use the provider list and directions links.'; }
  document.getElementById('locate')?.addEventListener('click', () => {
    if (!navigator.geolocation) { status.textContent = 'Location is not supported. Please search by suburb or postcode.'; return; }
    status.textContent = 'Finding your location…';
    navigator.geolocation.getCurrentPosition(position => {
      const url = new URL(window.location.href);
      url.searchParams.delete('q');
      url.searchParams.set('lat', position.coords.latitude.toFixed(3));
      url.searchParams.set('lon', position.coords.longitude.toFixed(3));
      url.searchParams.set('category', document.getElementById('category').value);
      window.location.assign(url);
    }, () => { status.textContent = 'We could not access your location. You can still search by suburb or postcode.'; }, {timeout: 10000, maximumAge: 60000});
  });
})();
