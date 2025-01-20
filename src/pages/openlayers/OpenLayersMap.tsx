import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';
import OSM from 'ol/source/OSM';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import 'ol/ol.css';

const OpenLayersMap = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const [intervalTime,setIntervalTime] = useState(5*1000*60);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vectorTileLayerRef = useRef<VectorTileLayer | null>(null);

  const gettimestampFromZoom = (zoom:number=0)=>{
    const baseTime = 3600000;
    const factor = Math.pow(baseTime/2000, -1/10);
    const intervalTime = Math.round(baseTime * Math.pow(factor, zoom));
    return intervalTime
  }

  useEffect(()=>{
    if(mapInstanceRef.current){
      debugger;
      var zoom = mapInstanceRef.current?.getView().getZoom();
      var datetime = gettimestampFromZoom(zoom);
      intervalRef.current = setInterval(() => {
        var source = vectorTileLayerRef.current?.getSource() as VectorTileSource;
        source.setUrl(`http://localhost:2004/lastpoints/${Date.now()}/{z}/{x}/{y}.pbf`);
    }, datetime);
    }
  },[intervalTime])

  useEffect(() => {
    if (!mapRef.current) return;

    vectorTileLayerRef.current = new VectorTileLayer({
      source: new VectorTileSource({
        format: new MVT(),
        url: `http://localhost:2004/lastpoints/${Date.now()}/{z}/{x}/{y}.pbf`
      }),
      declutter:true,
      minZoom:0,
      maxZoom:10,
      style: (feature) => {
        const type = feature.get('type');
        const bearing = feature.get('bearing');
        return new Style({
          image: new Icon({
            src: `/icons/typet-${type}.png`,
            height: 20,
            rotation: bearing*Math.PI/180,
            //scale: 0.5
          })
        });
      }
    });

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        vectorTileLayerRef.current
      ],
      view: new View({
        center: [0, 0],
        zoom: 2
      })
    });

    map.on('moveend',()=>{
      const zoom = map.getView().getZoom();
      if(zoom !== undefined && zoom > 10){
        if(intervalRef.current){
          clearInterval(intervalRef.current);
        }
        return;
      }
      const datetime = gettimestampFromZoom(zoom);
      if(intervalRef.current){
        clearInterval(intervalRef.current);
      }
      setIntervalTime(datetime);
    })

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100vw', 
        height: '100vh', 
        position: 'absolute', 
        top: 0, 
        left: 0 
      }}
    />
  );
};

export default OpenLayersMap;
