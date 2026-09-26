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
    const layers=L.layerGroup().addTo(map);
    const markers=new Map();
    let expanded=null;
    const glyphs={
      vet:'<g transform="rotate(-40 12 12)"><rect x="2" y="7" width="20" height="10" rx="4"/><rect x="9" y="8" width="6" height="8" fill="white" opacity=".65"/></g>',
      park:'<path d="M11 13h2v10h-2z"/><circle cx="12" cy="7" r="6"/><circle cx="7" cy="12" r="5"/><circle cx="17" cy="12" r="5"/>',
      cafe:'<path d="M3 6h13v9a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM2 22h18v-2H2z"/><path d="M16 8h4q5 6-4 7" fill="none" stroke="currentColor" stroke-width="2"/>',
      hotel:'<path d="M2 9h20v12h-3v-3H5v3H2zM4 4h6v4H4zm9 0h6v4h-6z"/>',
      default:'<ellipse cx="12" cy="16" rx="5" ry="4"/><circle cx="5" cy="10" r="2.4"/><circle cx="10" cy="6" r="2.4"/><circle cx="16" cy="7" r="2.4"/><circle cx="20" cy="12" r="2.4"/>'
    };
    function addService(p,position){
      const popup=document.createElement('div');
      const title=document.createElement('strong');title.textContent=p.name;
      const label=document.createElement('p');label.textContent=p.category;
      const link=document.createElement('a');link.textContent='View details →';link.href=`/providers/${p.id}/`;
      popup.append(title,label,link);
      const kind=Object.hasOwn(glyphs,p.category_key)?p.category_key:'default';
      const icon=L.divIcon({className:`care-marker service-pin pin-${kind}`,html:`<svg viewBox="0 0 24 24" aria-hidden="true">${glyphs[kind]}</svg>`,iconSize:[38,38],iconAnchor:[19,19]});
      const marker=L.marker(position||[p.lat,p.lon],{icon,title:p.name,alt:p.name}).addTo(layers).bindPopup(popup);
      marker.on('click',()=>{
        document.querySelectorAll('.provider-card').forEach(c=>c.classList.remove('selected'));
        document.getElementById(`provider-${p.id}`)?.classList.add('selected');
      });
      markers.set(String(p.id),marker);
    }
    function showGroup(cluster){
      const origin=map.latLngToLayerPoint([cluster.lat,cluster.lon]);
      cluster.items.forEach((p,i)=>{
        const ring=Math.floor(i/10)+1;
        const angle=(i%10)*Math.PI/5;
        const position=map.layerPointToLatLng([origin.x+Math.cos(angle)*ring*48,origin.y+Math.sin(angle)*ring*48]);
        L.polyline([[p.lat,p.lon],position],{color:'#74877a',weight:1,interactive:false}).addTo(layers);
        addService(p,position);
      });
    }
    function renderGroups(){
      layers.clearLayers();markers.clear();
      const groups=window.YPCMapClusters.group(data,map.getZoom(),(p,z)=>map.project([p.lat,p.lon],z));
      groups.forEach(cluster=>{
        if(cluster.items.length===1){addService(cluster.items[0]);return;}
        if(expanded && cluster.items.some(p=>String(p.id)===expanded)){showGroup(cluster);return;}
        const count=cluster.items.length;
        const icon=L.divIcon({className:'service-cluster',html:`<span>${count}</span>`,iconSize:[48,48],iconAnchor:[24,24]});
        const marker=L.marker([cluster.lat,cluster.lon],{icon,title:`${count} services — zoom in`,alt:`${count} services — zoom in`}).addTo(layers);
        marker.on('click',()=>{
          if(map.getZoom()>=19){expanded=String(cluster.items[0].id);renderGroups();status.textContent='Services at this location are spread out for selection.';}
          else map.fitBounds(L.latLngBounds(cluster.items.map(p=>[p.lat,p.lon])),{padding:[60,60],maxZoom:Math.min(19,map.getZoom()+2)});
        });
      });
    }
    map.on('zoomend',()=>{expanded=null;renderGroups();});
    renderGroups();
    document.querySelectorAll('.map-focus').forEach(button=>button.addEventListener('click',()=>{
      const p=data.find(p=>String(p.id)===button.dataset.id);
      if(!p)return;
      map.setView([p.lat,p.lon],19,{animate:false});
      expanded=String(p.id);renderGroups();markers.get(String(p.id))?.openPopup();
      mapNode.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
    }));
  } else if(mapNode){mapNode.textContent='Map unavailable. Use the place list and directions links.';areaButton.hidden=true;}
  document.getElementById('locate')?.addEventListener('click',()=>{
    if(!window.isSecureContext){status.textContent='Phone browsers need HTTPS for GPS location. On this local preview, search a suburb or move the map instead.';return;}
    if(!navigator.geolocation){status.textContent='Location is not supported. Search a suburb or move the map instead.';return;}
    status.textContent='Finding your location…';
    navigator.geolocation.getCurrentPosition(position=>searchAt(position.coords.latitude,position.coords.longitude,12),()=>{status.textContent='Location could not be accessed. You can still search a suburb or move the map.';},{timeout:10000,maximumAge:60000});
  });
})();
