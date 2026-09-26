(() => {
  const mapNode = document.getElementById('care-map');
  const status = document.getElementById('location-status');
  const areaButton = document.getElementById('search-area');
  function searchAt(lat, lon, zoom) {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('lat',lat.toFixed(3));
    url.searchParams.set('lon',lon.toFixed(3));
    url.searchParams.set('zoom',String(zoom));
    url.searchParams.set('category',document.getElementById('category').value);
    url.searchParams.set('species',document.getElementById('species').value);
    url.searchParams.set('service_search',document.getElementById('service-keyword').value);
    if (document.getElementById('known').checked) url.searchParams.set('known','1');
    window.location.assign(url);
  }
  if (mapNode && window.L) {
    const center = JSON.parse(document.getElementById('map-center').textContent);
    const data = JSON.parse(document.getElementById('map-markers').textContent);
    const map = L.map(mapNode, {scrollWheelZoom:false}).setView(center,Number(mapNode.dataset.zoom)||12);
    L.tileLayer(mapNode.dataset.tileUrl,{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).addTo(map).on('tileerror',()=>{status.textContent='Some map tiles could not load. The place list and directions links are still available.';});
    map.on('moveend',()=>{
      areaButton.classList.add('dirty');
      areaButton.textContent='Search this area ↻';
      status.textContent='Map moved. Choose Search this area to find places within 15 km of its new centre.';
    });
    areaButton.addEventListener('click',()=>{
      const point=map.getCenter();
      areaButton.disabled=true;
      areaButton.textContent='Finding places…';
      searchAt(point.lat,point.lng,map.getZoom());
    });
    const markers = new Map();
    data.forEach(p=>{
      const popup=document.createElement('div');
      const title=document.createElement('strong'); title.textContent=p.name;
      const label=document.createElement('p'); label.textContent=p.category;
      const link=document.createElement('a'); link.textContent='View details →'; link.href=`/providers/${p.id}/`;
      popup.append(title,label,link);
      const icon=L.divIcon({className:'care-marker',html:'<span aria-hidden="true">✣</span>',iconSize:[36,36],iconAnchor:[18,18]});
      const marker=L.marker([p.lat,p.lon],{icon,title:p.name}).addTo(map).bindPopup(popup);
      marker.on('click',()=>{
        document.querySelectorAll('.provider-card').forEach(c=>c.classList.remove('selected'));
        document.getElementById(`provider-${p.id}`)?.classList.add('selected');
      });
      markers.set(String(p.id),marker);
    });
    document.querySelectorAll('.map-focus').forEach(button=>button.addEventListener('click',()=>{
      const marker=markers.get(button.dataset.id);
      if(marker){map.setView(marker.getLatLng(),15);marker.openPopup();mapNode.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});}
    }));
  } else if(mapNode){mapNode.textContent='Map unavailable. Use the place list and directions links.';areaButton.hidden=true;}
  document.getElementById('locate')?.addEventListener('click',()=>{
    if(!window.isSecureContext){status.textContent='Phone browsers need HTTPS for GPS location. On this local preview, search a suburb or move the map instead.';return;}
    if(!navigator.geolocation){status.textContent='Location is not supported. Search a suburb or move the map instead.';return;}
    status.textContent='Finding your location…';
    navigator.geolocation.getCurrentPosition(position=>searchAt(position.coords.latitude,position.coords.longitude,12),()=>{status.textContent='Location could not be accessed. You can still search a suburb or move the map.';},{timeout:10000,maximumAge:60000});
  });
})();
