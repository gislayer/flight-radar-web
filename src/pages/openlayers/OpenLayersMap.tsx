import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import VectorSource from 'ol/source/Vector';
import LineString from 'ol/geom/LineString';
import {Stroke, Style, Icon, Fill, Circle} from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import MVT from 'ol/format/MVT';
import 'ol/ol.css';
import API from '../../utils/API';
import {bbox} from '@turf/turf';
import { Airport, CurrentFlightData, FlightData, Path, PathFeature } from '../../types';
import VectorLayer from 'ol/layer/Vector';
import { transform, transformExtent } from 'ol/proj';
import { Zoom } from 'ol/control';
import { XYZ } from 'ol/source';
import InfoCard from '../../components/InfoCard';
import * as turf from '@turf/turf';
import { Feature } from 'ol';
import ChatPanel from '../../components/ChatPanel';
import GoToRoute from '../../components/GoToRoute';
import {setText, clearText} from '../../store/reducers/loader'
import { useDispatch } from 'react-redux';
import { message } from 'antd';
const VITE_API_URL = import.meta.env.VITE_API_URL;

const OpenLayersMap = () => {
  const dispatch = useDispatch();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const [intervalTime,setIntervalTime] = useState(5*1000*60);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vectorTileLayerRef = useRef<VectorTileLayer | null>(null);
  const pathLayerRef = useRef<VectorLayer | null>(null);
  const livePathLayerRef = useRef<VectorLayer | null>(null);
  const animationFrameRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const currentAircraftRef = useRef<VectorLayer | null>(null);
  const sliderAircraftRef = useRef<VectorLayer | null>(null);
  const markerLayerRef = useRef<VectorLayer | null>(null);
  const liveLayerRef = useRef<VectorLayer | null>(null);
  const liveStatus = useRef<boolean>(false);
  const [currentZoom,setCurrentZoom] = useState<number>(0);
  const sideBarStatus = useRef<boolean | null>(false);
  const aircraftDataRef = useRef<FlightData | null>(null);
  const [aircraftDataStatus,setAircraftDataStatus] = useState<boolean | null>(false);
  const [v,setData] = useState<FlightData | null>(null);
  const highlightAircraftRef = useRef<VectorLayer | null>(null);
  var api = new API({newurl:VITE_API_URL});
  dispatch(clearText());

  const getAircraftData = async (properties:any, zoom:boolean=true)=>{
    if(zoom){
      dispatch(setText('Route Loading...'));
    }
    const data = await api.get(`routes/${properties['id']}`) as FlightData;
    if(!data){
      //message.error('Route Not Found');
      dispatch(clearText());
      return;
    }
    aircraftDataRef.current = data;
    setAircraftDataStatus(true);
    sideBarStatus.current = true;
    data.path.features.unshift({
      type:'Feature',
      properties:{altitude:0,bearing:0,date:'',id:0,speed:0,type:data.aircraft.aircraftTypeId},
      geometry:data.start_airport.geometry
    });
    dispatch(clearText());
    if(zoom){
      message.success('Route Loaded');
    }
    setPathLayer(data.path, zoom);
    setData(data);
  }

  const gettimestampFromZoom = (zoom:number=0)=>{
    const baseTime = 3600000;
    const factor = Math.pow(baseTime/2000, -1/10);
    const intervalTime = Math.round(baseTime * Math.pow(factor, zoom));
    return intervalTime
    //return Date.now();
  }

  const setPathLayer = (path:Path, zoom:boolean=true)=>{
    
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
      if(zoom){
        var geomBbox = bbox(pathGeoJSON);
        var geomBbox3857 = transformExtent(geomBbox, 'EPSG:4326', 'EPSG:3857');
        flyToBBox(geomBbox3857);
      }
      var features = new GeoJSON().readFeatures(pathGeoJSON, { 
        featureProjection: 'EPSG:3857'
      });
      source.addFeatures(features);
    }
  }

  const flyToBBox = (bbox:number[])=>{
    if(mapInstanceRef.current){
      mapInstanceRef.current.getView().fit(bbox, {duration: 500, padding:[100,100,100,400], maxZoom:15});
    }
  }

  const getEmptyVectorSource = ()=>{
    return new VectorSource({
      features: new GeoJSON().readFeatures({type:'FeatureCollection', features:[]}, {
        featureProjection: 'EPSG:3857'
      })
    });
  }

  const addCurrentAircraft = ()=>{
    if(currentAircraftRef.current){
      return currentAircraftRef.current;
    }
    currentAircraftRef.current = new VectorLayer({
      source: getEmptyVectorSource(),
      style: (feature:any)=>{
        return getAircraftStyle(feature.getProperties() as CurrentFlightData,'normal');
      }
    });
    return currentAircraftRef.current;
  } 

  const addMarkerLayer = ()=>{
    if(markerLayerRef.current){
      return markerLayerRef.current;
    }
    markerLayerRef.current = new VectorLayer({
      source: getEmptyVectorSource(),
      style: (feature:any)=>{
        var props:any = feature.getProperties();
        return getIconStyle(props['icon'], props['size'], props['color']);
      }
    });
    return markerLayerRef.current;
  }

  const addSliderAircraft = ()=>{
    if(sliderAircraftRef.current){
      return sliderAircraftRef.current;
    }
    sliderAircraftRef.current = new VectorLayer({
      source: getEmptyVectorSource(),
      style: (feature:any)=>{
        return getAircraftStyle(feature.getProperties() as CurrentFlightData,'slider');
      }
    });
    return sliderAircraftRef.current;
  }

  const addHighlightAircraft = ()=>{
    if(highlightAircraftRef.current){
      return highlightAircraftRef.current;
    }
    highlightAircraftRef.current = new VectorLayer({
      source: getEmptyVectorSource(),
      style: (feature:any)=>{
        return getAircraftStyle(feature.getProperties() as CurrentFlightData,'hover');
      }
    });
    return highlightAircraftRef.current;
  }

  const updateLiveData = async () => {
    if(aircraftDataRef.current?.id==1){return;}
    if(!mapInstanceRef.current) return;
    var zoom = mapInstanceRef.current.getView().getZoom();
    if(!zoom){ return;}
    if(zoom < 10) return;

    const extent = mapInstanceRef.current.getView().calculateExtent();
    const bbox = transformExtent(extent, 'EPSG:3857', 'EPSG:4326');

    try {
      const geojsonData = await api.post('routes/jobs/live',{bbox:bbox});
      if(!geojsonData) return;
      const source = liveLayerRef.current?.getSource();
      if(!source) return;

      source.clear();

      const features:any[] = new GeoJSON({
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      }).readFeatures(geojsonData);

      features.forEach(feature => {
        const props = feature.getProperties();
        const speed = props.speed;
        const bearing = props.bearing;
        
        if(speed && bearing){
          const startCoord = feature.getGeometry().getCoordinates();
          var startCoord4326 = transform(startCoord, 'EPSG:3857', 'EPSG:4326');
          let lastTime = Date.now();
          var i=0;
          
          const animate = () => {
            const now = Date.now();
            const deltaTime = now - lastTime;
            const distance = (speed/(4.14)) * (deltaTime/1000);
            var newCoord = turf.destination(turf.point(startCoord4326), distance, bearing, {units: 'meters'});
            var newFeature:any = transform(newCoord.geometry.coordinates, 'EPSG:4326', 'EPSG:3857');     
            feature.getGeometry().setCoordinates(newFeature);
            animationFrameRef.current = requestAnimationFrame(animate);
            if(sideBarStatus.current && i%10==0){
              updatePathLayer();
            }
            i++;
          };
          
          animate();
        }
      });

      source.addFeatures(features);
      if(sideBarStatus.current){
        await getAircraftData({id:Number(features[0].getProperties().id)},false);
      }

    } catch(err) {
      console.error('Live data update error', err);
    }
  };

  const addLiveLayer = () => {
    if(liveLayerRef.current){
      return liveLayerRef.current;
    }
    liveLayerRef.current = new VectorLayer({
      source: getEmptyVectorSource(),
      minZoom: 10,
      style: (feature:any)=>{
        return getAircraftStyle(feature.getProperties() as CurrentFlightData,'normal');
      }
    });

    setInterval(updateLiveData, 10000);
    updateLiveData();

    return liveLayerRef.current;
  }

  const updatePathLayer = ()=>{
    if(livePathLayerRef.current && aircraftDataRef.current){
      var planesLayer = liveLayerRef.current?.getSource() as VectorSource;
      var planes = planesLayer.getFeatures();
      if(planes.length>0){
        var source = livePathLayerRef.current.getSource() as VectorSource;
        var lastPoint = aircraftDataRef.current?.path.features[aircraftDataRef.current?.path.features.length-1];
        var lastPoint3857 = transform(lastPoint.geometry.coordinates, 'EPSG:4326', 'EPSG:3857');
        var activeRoute = aircraftDataRef.current?.id;
        source.clear();
        planes.forEach((plane:any) => {
          var planeProps = plane.getProperties();
          if(planeProps.id == activeRoute){
            var nowPoint = plane.getGeometry().getCoordinates();
            var line = new LineString([lastPoint3857,nowPoint]);
            var feature = new Feature({geometry:line,altitude:planeProps.altitude});
            source.addFeature(feature);
          }
        });
      }
    }
  }

  const getPathLayerStyle = (feature:any)=>{
    const geometry = feature.getGeometry();
    const styles = [];
    //beyaz 255 255 255
    //sari 255 255 0
    // acik mavi 0 255 255
    // koyu mavi 0 0 255
    // kirmizi 255 0 0



    if (geometry) {
      const coordinates = geometry.getCoordinates();

      function getDynamicColor2(altitude: number): string {
        if(altitude<50){
          return '#ffffff';
        }
        const minAltitude = 0;
        const maxAltitude = 14000;
        const scale = Math.min(1, Math.max(0, (altitude - minAltitude) / (maxAltitude - minAltitude)));
        let red, green, blue;
      
        if (scale <= 0.166) {
          red = 255;
          green = 255;
          blue = Math.round(255 * (1 - scale/0.166));
        } else if (scale <= 0.333) {
          red = Math.round(255 * (1 - ((scale - 0.166) / 0.166)));
          green = 255;
          blue = 0;
        } else if (scale <= 0.5) {
          red = 0;
          green = 255;
          blue = Math.round(255 * ((scale - 0.333) / 0.166));
        } else if (scale <= 0.666) {
          red = 0;
          green = Math.round(255 * (1 - ((scale - 0.5) / 0.166)));
          blue = 255;
        } else{
          red = Math.round(255 * ((scale - 0.666) / 0.166));
          green = 0;
          blue = 255;
        }
        return `rgb(${red}, ${green}, ${blue})`;
      }
      
      for (let i = 0; i < coordinates.length - 1; i++) {
        const altitude = feature.get('altitude');
        
        let color = getDynamicColor2(altitude);

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

  const addLivePathLayer = ()=>{
    if(livePathLayerRef.current){
      return livePathLayerRef.current;
    }
    livePathLayerRef.current = new VectorLayer({
      source: getEmptyVectorSource(),
      style: (feature: any) => {
        return getPathLayerStyle(feature);
      }
    });
    return livePathLayerRef.current;
  }

  const addPathLayer = () => {
    if (pathLayerRef.current) {
      return pathLayerRef.current;
    }
    pathLayerRef.current = new VectorLayer({
      source: getEmptyVectorSource(),
      style: (feature: any) => {
        return getPathLayerStyle(feature);
      }
    });

    return pathLayerRef.current;
  }

  const addStationMarker = (geometry:any, iconPath: string, size:number=22, color:string='rgb(0,0,0)') => {
    var geojson:any = {type:'Feature',properties:{icon:iconPath,size,color},geometry:geometry};
    var source = markerLayerRef.current?.getSource();
    var feature = new GeoJSON().readFeature(geojson, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    });
    source?.clear();
    source?.addFeature(feature);
  }

  const getIconStyle = (path:string, size:number=22, color:string='rgb(0,0,0)')=>{
    return [
      
      new Style({
        image: new Circle({
          radius: (size/2)+8,
          fill: new Fill({
            color: color
          }),
          stroke: new Stroke({
            color: '#333',
            width: 2
          })
        })
      }),
      new Style({
        image: new Icon({
          src: path,
          height: size,
          color: '#fff'
        })
      }),
    ]
  }

  const getAircraftStyle = (props:CurrentFlightData,type:'normal' | 'hover' | 'select' | 'slider')=>{
    var color  = 'rgb(255, 193, 7)';
    var size = 22;
    switch(type){
      case 'hover':{
        color = 'rgb(118, 220, 0)';
        break;
      }
      case 'select':{
        color = 'rgb(0, 188, 212)';
        size=28
        break;
      }
      case 'slider':{
        color = 'rgb(0, 188, 212)';
        size=28
        break;
      }
    }
    return [
      new Style({
        image: new Icon({
          src: `/icons/plane${props.type}.png`,
          height: size,
          rotation: (props?.bearing || props.bearing) * Math.PI/180, 
          opacity: 0.7,
          color: 'rgb(0, 0, 0)',
          displacement: [4,4]
        })
      }),
      new Style({
        image: new Icon({
          src: `/icons/plane${props.type}.png`,
          height: size,
          color: color,
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
        return getAircraftStyle(props,'normal');
        
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
    const source = sliderAircraftRef.current?.getSource();
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
  },[intervalTime,currentZoom])

  useEffect(() => {
    if (!mapRef.current) return;

    var basemap = new TileLayer({
      source: new XYZ({url:`https://mts{0-3}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}`})
    });
    var layer = addVectorTileLayer();
    var path = addPathLayer();
    var livePath = addLivePathLayer();
    var highlightAircraft = addHighlightAircraft();
    var currentAircraft = addCurrentAircraft();
    var sliderAircraft = addSliderAircraft();
    var marker = addMarkerLayer();
    var live = addLiveLayer();
    const map = new Map({
      target: mapRef.current,
      layers: [
        basemap,
        path,
        livePath,
        layer,
        live,
        highlightAircraft,
        currentAircraft,
        sliderAircraft,
        marker
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
        layerFilter: (layer) => layer === vectorTileLayerRef.current || layer === liveLayerRef.current
      });
      if (features && features.length > 0) {
        const feature = features[0];
        const properties = feature.getProperties() as CurrentFlightData;
        getAircraftData(properties,true);
      }
    })

    map.on('pointermove',(e:any)=>{
      const features = map.getFeaturesAtPixel(e.pixel, {
        layerFilter: (layer) => layer === vectorTileLayerRef.current || layer === liveLayerRef.current
      });
      const source = highlightAircraftRef.current?.getSource();
      if(source){
        if(features && features.length > 0){
          const feature = features[0];
          source.clear();
          source.addFeature(feature);
        } else {
          source.clear();
        }
      }
    })

    map.on('moveend',(e:any)=>{
      var zoom = map.getView().getZoom();
      if(zoom !== undefined && zoom > 10){
        if(liveStatus.current==false){
          liveStatus.current = true;
          updateLiveData();
        }
      }else{
        if(liveStatus.current==true){
          liveStatus.current = false;
          //updateLiveData();
        }
        setCurrentZoom(Number(zoom));
      }

    });

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

  const onSidebarClose = ()=>{
    setAircraftDataStatus(false);
    sideBarStatus.current = false;
    const sourceh = highlightAircraftRef.current?.getSource();
    if(sourceh){
      sourceh.clear();
    }
    const sourcec = currentAircraftRef.current?.getSource();
    if(sourcec){
      sourcec.clear();
    }
    const sources = sliderAircraftRef.current?.getSource();
    if(sources){
      sources.clear();
    }
    const sourcep = pathLayerRef.current?.getSource();
    if(sourcep){
      sourcep.clear();
    }
    const sourcem = markerLayerRef.current?.getSource();
    if(sourcem){
      sourcem.clear();
    }
    var sourcelp = livePathLayerRef.current?.getSource() as VectorSource;
    if(sourcelp){
      sourcelp.clear();
    }
  }

  const flyToLatLng = (coords:number[])=>{
    var c = transform(coords,'EPSG:4326','EPSG:3857');
    flyToBBox([c[0]-0.05,c[1]-0.05,c[0]+0.05,c[1]+0.05]);
  }

  return (
    <div>
      { aircraftDataStatus && <InfoCard events={(type:string, data:any)=>{
        switch(type){
          case 'start_airport_clicked':
            var subData = data as Airport;
            flyToLatLng(subData.geometry.coordinates);
            addStationMarker(subData.geometry, '/icons/marker_tower.png', 22, '#ff5722');
            break;
          case 'finish_airport_clicked':
            var subData = data as Airport;
            flyToLatLng(subData.geometry.coordinates);
            addStationMarker(subData.geometry, '/icons/marker_tower.png', 22, '#4caf50');
            break;
        }
      }} data={v} onClose={onSidebarClose} onChange={(p:PathFeature)=>{
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
      <div className='z-10000'><ChatPanel /></div>
      <GoToRoute onSearch={(route_id:number)=>{
        getAircraftData({id:route_id},true);
      }} />
    </div>
  );
};

export default OpenLayersMap;
