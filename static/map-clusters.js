(() => {
  // Screen-distance groups keep every result once, independent of map panning.
  function group(records, zoom, project, radius=58) {
    const groups=[];
    [...records].sort((a,b)=>a.id-b.id).forEach(record=>{
      const point=project(record,zoom);
      let closest=null, best=radius*radius;
      for(const cluster of groups){
        const d=(cluster.x-point.x)**2+(cluster.y-point.y)**2;
        if(d<=best){closest=cluster;best=d;}
      }
      if(!closest){groups.push({x:point.x,y:point.y,lat:record.lat,lon:record.lon,items:[record]});return;}
      const n=closest.items.length;
      closest.x=(closest.x*n+point.x)/(n+1);closest.y=(closest.y*n+point.y)/(n+1);
      closest.lat=(closest.lat*n+record.lat)/(n+1);closest.lon=(closest.lon*n+record.lon)/(n+1);
      closest.items.push(record);
    });
    return groups;
  }
  window.YPCMapClusters={group};
})();
