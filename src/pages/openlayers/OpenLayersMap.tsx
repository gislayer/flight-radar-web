import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import VectorSource from 'ol/source/Vector';
import LineString from 'ol/geom/LineString';
import Stroke from 'ol/style/Stroke';
import GeoJSON from 'ol/format/GeoJSON';
import MVT from 'ol/format/MVT';
import OSM from 'ol/source/OSM';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import 'ol/ol.css';
import API from '../../utils/API';
import {bbox} from '@turf/turf';
import { CurrentFlightData, FlightData, Path, PathFeature } from '../../types';
import VectorLayer from 'ol/layer/Vector';
import { transformExtent } from 'ol/proj';
import { Zoom } from 'ol/control';
import { XYZ } from 'ol/source';
import InfoCard from '../../components/InfoCard';
const VITE_API_URL = import.meta.env.VITE_API_URL;

const OpenLayersMap = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const [intervalTime,setIntervalTime] = useState(5*1000*60);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vectorTileLayerRef = useRef<VectorTileLayer | null>(null);
  const pathLayerRef = useRef<VectorLayer | null>(null);
  const animationFrameRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const currentPositionsRef = useRef<{[key: string]: {x: number, y: number, bearing: number}}>({});
  const targetPositionsRef = useRef<{[key: string]: {x: number, y: number, bearing: number}}>({});
  const currentAircraftRef = useRef<VectorLayer | null>(null);
  const [aircraftData,setAircraftData] = useState<FlightData | null>(null);
  const highlightAircraftRef = useRef<VectorLayer | null>(null);
  var api = new API({newurl:VITE_API_URL});


  const getAircraftData = async (properties:CurrentFlightData, coordinate:number[])=>{
    const data = await api.get(`routes/${properties['id']}`) as FlightData;
    setAircraftData(data);
    setPathLayer(data.path);
  }

  const gettimestampFromZoom = (zoom:number=0)=>{
    /*const baseTime = 3600000;
    const factor = Math.pow(baseTime/2000, -1/10);
    const intervalTime = Math.round(baseTime * Math.pow(factor, zoom));
    return intervalTime*/
    return Date.now();
  }

  const setPathLayer = (path:Path )=>{
    debugger;
    
    if(pathLayerRef.current){
      var pathGeoJSON:any = {
        type: 'FeatureCollection',
        features: []
      };
      for(var i=0;i<path.features.length-1;i++){
        var i2 = i+1;
        if(i2 < path.features.length){
          pathGeoJSON.features.push({
            type: 'Feature',
            properties: path.features[i].properties,
            geometry: {
              type: 'LineString',
              coordinates: [path.features[i].geometry.coordinates, path.features[i2].geometry.coordinates]
            }
          });
        }
      }
      var source = pathLayerRef.current.getSource() as VectorSource;
      source.clear();
      var geomBbox = bbox(pathGeoJSON);
      var geomBbox3857 = transformExtent(geomBbox, 'EPSG:4326', 'EPSG:3857');
      flyToBBox(geomBbox3857);
      var features = new GeoJSON().readFeatures(pathGeoJSON, { 
        featureProjection: 'EPSG:3857'
      });
      source.addFeatures(features);
    }
  }

  const flyToBBox = (bbox:number[])=>{
    if(mapInstanceRef.current){
      mapInstanceRef.current.getView().fit(bbox, {duration: 500, padding:[100,100,100,400]});
    }
  }

  const animate = (timestamp: number) => {
    const progress = (timestamp - lastUpdateTimeRef.current) / 2000; // 2 saniye içinde tamamlanacak
    
    if (progress < 1) {
      Object.keys(currentPositionsRef.current).forEach(id => {
        const current = currentPositionsRef.current[id];
        const target = targetPositionsRef.current[id];
        if (current && target) {
          current.x += (target.x - current.x) * 0.1;
          current.y += (target.y - current.y) * 0.1;
          current.bearing += (target.bearing - current.bearing) * 0.1;
        }
      });
      
      if (vectorTileLayerRef.current) {
        vectorTileLayerRef.current.changed();
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  };

  const addCurrentAircraft = ()=>{
    if(currentAircraftRef.current){
      return currentAircraftRef.current;
    }
    currentAircraftRef.current = new VectorLayer({
      source: new VectorSource({
        features: new GeoJSON().readFeatures({type:'FeatureCollection', features:[]}, {
          featureProjection: 'EPSG:3857'
        })
      }),
      style: (feature:any)=>{
        debugger;
        return getAircraftStyle(feature.getProperties() as CurrentFlightData,true);
      }
    });
    return currentAircraftRef.current;
  }

  const addHighlightAircraft = ()=>{
    if(highlightAircraftRef.current){
      return highlightAircraftRef.current;
    }
    highlightAircraftRef.current = new VectorLayer({
      source: new VectorSource({
        features: new GeoJSON().readFeatures({type:'FeatureCollection', features:[]}, {
          featureProjection: 'EPSG:3857'
        })
      }),
      style: (feature:any)=>{
        return getAircraftStyle(feature.getProperties() as CurrentFlightData,true);
      }
    });
    return highlightAircraftRef.current;
  }

  const addPathLayer = () => {
    if (pathLayerRef.current) {
      return pathLayerRef.current;
    }

    pathLayerRef.current = new VectorLayer({
      source: new VectorSource({
        features: new GeoJSON().readFeatures({type:'FeatureCollection', features:[]}, {
          featureProjection: 'EPSG:3857'
        })
      }),
      style: (feature: any) => {
        debugger;
        const geometry = feature.getGeometry();
        const styles = [];

        if (geometry) {
          const coordinates = geometry.getCoordinates();
          
          for (let i = 0; i < coordinates.length - 1; i++) {
            const altitude = feature.get('altitude');
            let color = '#8B008B';
            if(altitude<=2000){
              color = '#FFFFFF';
            }else if(altitude<=4000){
              color = '#FFFF00';
            }else if(altitude<=6000){
              color = '#FFD700';
            }else if(altitude<=8000){
              color = '#FFA500';
            }else if(altitude<=10000){
              color = '#FF0000';
            }else{
              color = '#8B008B';
            }

            styles.push(new Style({
              stroke: new Stroke({
                color: color,
                width: 3
              }),
              geometry: new LineString([coordinates[i], coordinates[i + 1]])
            }));
          }
        }
        
        return styles;
      }
    });

    return pathLayerRef.current;
  }

  const getAircraftStyle = (props:CurrentFlightData,highlight:boolean=false)=>{
    return [
      new Style({
        image: new Icon({
          src: `/icons/typeg-${props.type}.png`,
          height: highlight?25:22,
          rotation: (props?.bearing || props.bearing) * Math.PI/180, 
          opacity: 1,
          //color: 'rgba(0, 0, 0, 0.5)',
          displacement: [-5, 5]
        })
      }),
      new Style({
        image: new Icon({
          src: `/icons/types${highlight ? 'h' : ''}-${props.type}.png`,
          height: highlight?25:20,
          rotation: (props?.bearing || props.bearing) * Math.PI/180,
        })
      })
    ];
  }

  const addVectorTileLayer = () => {
    if(vectorTileLayerRef.current){
      return vectorTileLayerRef.current;
    }
    vectorTileLayerRef.current = new VectorTileLayer({
      source: new VectorTileSource({
        format: new MVT(),
        url: `http://localhost:2004/lastpoints/${Date.now()}/{z}/{x}/{y}.pbf`
      }),
      declutter: false,
      minZoom: 0,
      maxZoom: 10,
      style: (feature) => {
        var props = feature.getProperties() as CurrentFlightData;
        return getAircraftStyle(props);
        
      }
    });
    return vectorTileLayerRef.current;
  }

  const getCurrentTileURL = ()=>{
    const zoom = mapInstanceRef.current?.getView().getZoom();
    const datetime = gettimestampFromZoom(zoom);
    return `http://localhost:2004/lastpoints/${datetime}/{z}/{x}/{y}.pbf`;
  }

  const setAircraftPosition = (p:PathFeature)=>{
    const source = currentAircraftRef.current?.getSource();
    if(source){
      source.clear();
      var feature = new GeoJSON({dataProjection:'EPSG:4326', featureProjection:'EPSG:3857'}).readFeature(p);
      source.addFeature(feature);
    }
  }

  useEffect(()=>{
    if(mapInstanceRef.current){
      var zoom = mapInstanceRef.current?.getView().getZoom();
      var datetime = gettimestampFromZoom(zoom);
      intervalRef.current = setInterval(() => {
        lastUpdateTimeRef.current = Date.now();
        var source = vectorTileLayerRef.current?.getSource() as VectorTileSource;
        source.setUrl(getCurrentTileURL());
      }, 200000);
    }
    
    /*return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };*/
  },[intervalTime])

  useEffect(() => {
    if (!mapRef.current) return;

    var basemap = new TileLayer({
      source: new XYZ({url:`https://mts{0-3}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}`})
    });
    var layer = addVectorTileLayer();
    var path = addPathLayer();
    var highlightAircraft = addHighlightAircraft();
    var currentAircraft = addCurrentAircraft();

    const map = new Map({
      target: mapRef.current,
      layers: [
        basemap,
        path,
        layer,
        highlightAircraft,
        currentAircraft
      ],
      view: new View({
        center: [0, 0],
        zoom: 2
      }),
      controls:[]
    });

    var zoomControl = new Zoom({
      className: 'custom-zoom',
    });
    map.addControl(zoomControl);


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

    map.on('click',(e:any)=>{
      const features = map.getFeaturesAtPixel(e.pixel, {
        layerFilter: (layer) => layer === vectorTileLayerRef.current
      });
      if (features && features.length > 0) {
        const feature = features[0];
        const properties = feature.getProperties() as CurrentFlightData;
        const coordinate = e.coordinate;
        getAircraftData(properties,coordinate);
      }
    })

    map.on('pointermove',(e:any)=>{
      const features = map.getFeaturesAtPixel(e.pixel, {
        layerFilter: (layer) => layer === vectorTileLayerRef.current
      });
      if(features && features.length > 0){
        debugger;
        const feature = features[0];
        const source = highlightAircraftRef.current?.getSource();
        if(source){
          source.clear();
          source.addFeature(feature);
        }
      }
    })

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div>
      { aircraftData && <InfoCard data={aircraftData} onChange={(p:PathFeature)=>{
        debugger;
        setAircraftPosition(p);
      }}/> }
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
    </div>
  );
};

export default OpenLayersMap;
