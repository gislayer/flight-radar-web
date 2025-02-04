import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import 'mapbox-gl/dist/mapbox-gl.css';
import { FeatureCollection } from 'geojson';

interface Props {
  path: any;
  speed?: number;
}

const MapboxAnimation = ({ path, speed = 1 }: Props) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const customLayer = useRef<any>(null);
  const intervar = useRef<any>(null);
  const animationInterval = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);  
  const [currentIndex, setCurrentIndex] = useState(0);
  const index = useRef<number>(0);
  const mt = useRef<any>(null);
  const [animationSpeed, setAnimationSpeed] = useState(speed);
  const [pitch, setPitch] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [fark, setFark] = useState<number>(0);

  const getSteps = (path:any) => {
    const steps: any = {
      type: "FeatureCollection", 
      features: []
    };

    for (let i = 0; i < path.features.length - 1; i++) {
      const currentPoint = path.features[i];
      const nextPoint = path.features[i + 1];

      const currentDate = new Date(currentPoint.properties.date);
      const nextDate = new Date(nextPoint.properties.date);
      
      const timeDiffSeconds = (nextDate.getTime() - currentDate.getTime()) / 1000;
      
      const distance = turf.distance(
        currentPoint.geometry.coordinates,
        nextPoint.geometry.coordinates,
        {units: 'meters'}
      );

      const speed = distance / timeDiffSeconds;

      const bearing = turf.bearing(
        currentPoint.geometry.coordinates,
        nextPoint.geometry.coordinates
      );

      for (let second = 0; second < timeDiffSeconds; second++) {
        const fraction = second / timeDiffSeconds;
        
        const currentCoord = turf.along(
          turf.lineString([
            currentPoint.geometry.coordinates,
            nextPoint.geometry.coordinates
          ]),
          distance * fraction,
          {units: 'meters'}
        );

        const altitude = currentPoint.properties.altitude + 
          (nextPoint.properties.altitude - currentPoint.properties.altitude) * fraction;

        steps.features.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: currentCoord.geometry.coordinates
          },
          properties: {
            altitude: altitude,
            bearing: bearing,
            speed: speed,
            timestamp: currentDate.getTime() + (second * 1000)
          }
        });
      }
    }

    return steps;
  }

  //path = getSteps(path);

  const adjustModelHeight = (modelAltitude: number, terrainAltitude: number): number => {
    const offset = 10;
    return Math.max(modelAltitude, terrainAltitude + offset);
  };

  const  getTerrainAltitude= async(lng: number, lat: number) => {
    return await map.current?.queryTerrainElevation([lng, lat]);
  }

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = 'pk.eyJ1IjoiYWxpa2lsaWNoYXJpdGEiLCJhIjoiY2prcGpwajY4MnpqMDNxbXpmcnlrbWdneCJ9.0NaE-BID7eX38MDSY40-Qg';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: path.features[0].geometry.coordinates,
      zoom: 10,
      pitch: 60
    });

    map.current.on('load', () => {
      map.current?.addSource('satellite', {
        'type': 'raster',
        'tiles': [
          'https://mts0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          'https://mts1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          'https://mts2.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          'https://mts3.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
        ],
        'tileSize': 256
      });

      map.current?.addLayer({
        'id': 'satellite',
        'type': 'raster',
        'source': 'satellite',
        'paint': {
          'raster-opacity': 1
        }
      });

      // Terrain Layer
      /*map.current?.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 14
      });

      map.current?.setTerrain({
        'source': 'mapbox-dem',
        'exaggeration': 1.5
      });*/

      map.current?.addLayer({
        'id': 'sky',
        'type': 'sky',
        'paint': {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 15
        }
      });

      map.current?.on('moveend', () => {
        setZoomLevel(map.current?.getZoom() ?? 0);
        setPitch(map.current?.getPitch() ?? 0);
        var center = map.current?.getCenter() as any;
        var p = path.features[currentIndex].geometry.coordinates;
        var dest = turf.distance(turf.point([center.lng, center.lat]), turf.point(p), {units: 'meters'});
        setFark(dest as any);
      });

      const modelOrigin = path.features[0].geometry.coordinates;
      const modelAltitude = path.features[0].properties.altitude;
      const modelRotate = [Math.PI/2, 0, path.features[0].properties.bearing * Math.PI / 180];

      const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
        modelOrigin,
        modelAltitude
      );

      const modelTransform = {
        translateX: modelAsMercatorCoordinate.x,
        translateY: modelAsMercatorCoordinate.y,
        translateZ: modelAsMercatorCoordinate.z,
        rotateX: modelRotate[0],
        rotateY: modelRotate[1],
        rotateZ: modelRotate[2],
        scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
      };
      mt.current = modelTransform;

      customLayer.current = {
        id: '3d-model',
        type: 'custom',
        renderingMode: '3d',
        onAdd: function(map: any, gl: any) {
          this.camera = new THREE.Camera();
          this.scene = new THREE.Scene();

          const directionalLight = new THREE.DirectionalLight(0xffffff);
          directionalLight.position.set(0, -70, 100).normalize();
          this.scene.add(directionalLight);

          const directionalLight2 = new THREE.DirectionalLight(0xffffff);
          directionalLight2.position.set(0, 70, 100).normalize();
          this.scene.add(directionalLight2);

          const loader = new GLTFLoader();
          loader.load('/model/scene.gltf', (gltf:any) => {
            this.scene.add(gltf.scene);
            this.scene.scale.set(0.025,0.025,0.025);
          });

          this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true
          });

          this.renderer.autoClear = false;
        },
        render: function(gl: any, matrix: any) {
          const rotationX = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(1, 0, 0),
            mt.current.rotateX
          );
          const rotationY = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 1, 0),
            mt.current.rotateY
          );
          const rotationZ = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 0, 1),
            mt.current.rotateZ
          );

          const m = new THREE.Matrix4().fromArray(matrix);
          const l = new THREE.Matrix4()
            .makeTranslation(
              mt.current.translateX,
              mt.current.translateY,
              mt.current.translateZ
            )
            .scale(
              new THREE.Vector3(
                mt.current.scale,
                -mt.current.scale,
                mt.current.scale
              )
            )
            .multiply(rotationX)
            .multiply(rotationY)
            .multiply(rotationZ);

          this.camera.projectionMatrix = m.multiply(l);
          this.renderer.resetState();
          this.renderer.render(this.scene, this.camera);
          map.current?.triggerRepaint();
        }
      };

      map.current?.addLayer(customLayer.current);
    });

    return () => {
      map.current?.remove();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const getAwesomeRange = (altitude:number) => {
    var ranges = [
      {minAlt:0, maxAlt:50, zoom:18.10, pitch:60, len:50},
      {minAlt:50, maxAlt:100, zoom:15.5, pitch:60, len:300},
      {minAlt:100, maxAlt:500, zoom:15, pitch:60, len:500},
      {minAlt:500, maxAlt:1000, zoom:14, pitch:60, len:800},
      {minAlt:1000, maxAlt:2000, zoom:13, pitch:60, len:1200},
      {minAlt:2000, maxAlt:3000, zoom:12, pitch:60, len:1800},
      {minAlt:3000, maxAlt:4000, zoom:11.5, pitch:60, len:2500},
      {minAlt:4000, maxAlt:5000, zoom:11, pitch:60, len:3500},
      {minAlt:5000, maxAlt:6000, zoom:10.5, pitch:60, len:4500},
      {minAlt:6000, maxAlt:7000, zoom:10, pitch:60, len:5500},
      {minAlt:7000, maxAlt:8000, zoom:9.5, pitch:60, len:6500},
      {minAlt:8000, maxAlt:9000, zoom:9, pitch:60, len:7500},
      {minAlt:9000, maxAlt:10000, zoom:8.5, pitch:60, len:8500},
      {minAlt:10000, maxAlt:11000, zoom:8, pitch:60, len:9500},
      {minAlt:11000, maxAlt:12000, zoom:7.5, pitch:60, len:10500},
      {minAlt:12000, maxAlt:13000, zoom:7, pitch:60, len:11500},
      {minAlt:13000, maxAlt:14000, zoom:6.5, pitch:60, len:12500},
      {minAlt:14000, maxAlt:15000, zoom:6, pitch:60, len:13500},
    ];

    const range = ranges.find(range => altitude >= range.minAlt && altitude <= range.maxAlt);
    
    if (!range) {
      return ranges[ranges.length - 1];
    }

    return range;
  }

  const watchPlane = (lat:number, lng:number, altitude:number, speed:number, bearing:number) => {
    if(animationInterval.current){
      clearInterval(animationInterval.current);
    }
    changeModelPosition(lat, lng, altitude, bearing);
    var range:any = getAwesomeRange(altitude);
    var calculatedZoom = range.zoom;
    var len = range.len;
    var newCoord = turf.destination(turf.point([lng, lat]), len, bearing, {'units':'meters'});
    map.current?.flyTo({
      center: newCoord.geometry.coordinates as [number, number],
      zoom: calculatedZoom,
      pitch: 0,
      bearing: bearing,
      duration: 2000,
      essential: true
    });
    animationInterval.current = setInterval(() => {
      const timeStep = 0.05; 
      const distance = speed * timeStep; 
      
      const nextPoint = turf.destination(
        turf.point([lng, lat]), 
        distance/1000, 
        bearing,
        {units: 'kilometers'}
      );
      
      const newLng = nextPoint.geometry.coordinates[0];
      const newLat = nextPoint.geometry.coordinates[1];
  
      changeModelPosition(newLat, newLng, altitude, bearing);
      
      lng = newLng;
      lat = newLat;
      map.current?.setCenter([lng, lat]);
      
    }, 50);
  }

  const changeModelPosition = async (lat: any, lng: any, altitude: any, bearing: any) => {
    var terrainAltitude:any = await getTerrainAltitude(lat, lng);
    terrainAltitude = terrainAltitude==null?0:terrainAltitude;
    const adjustedAltitude = adjustModelHeight(altitude, terrainAltitude);

    const modelOrigin:any = [lng, lat];
    const modelAltitude = adjustedAltitude;
    var bearingRad = bearing * Math.PI / 180;
    var newBearing = Math.PI - bearingRad;
    const modelRotate = [Math.PI/2, newBearing, 0];

    const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
      modelOrigin,
      modelAltitude
    );

    customLayer.current.modelTransform = {
      translateX: modelAsMercatorCoordinate.x,
      translateY: modelAsMercatorCoordinate.y,
      translateZ: modelAsMercatorCoordinate.z,
      rotateX: modelRotate[0],
      rotateY: modelRotate[1],
      rotateZ: modelRotate[2],
      scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
    };
    mt.current = customLayer.current.modelTransform;
    map.current?.triggerRepaint();
  }

  const togglePlay = () => {
    if(isPlaying==false){
      debugger;
      setIsPlaying(true);
      setCurrentIndex(index.current + 1);
      /*intervar.current = setInterval(() => {
        setCurrentIndex(index.current + 1);
      }, 5000/animationSpeed);*/
    }else{
      setIsPlaying(false);
      clearInterval(intervar.current);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value);
    setCurrentIndex(index);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAnimationSpeed(parseFloat(e.target.value));
  };

  const animateRealFlight = (startPoint: any, endPoint: any) => {
    const line = turf.lineString([
      startPoint.geometry.coordinates,
      endPoint.geometry.coordinates
    ]);
    const distance = turf.length(line, { units: 'kilometers' });
  
    const duration = 1000 / animationSpeed;
  
    const steps = 20;
    const coordinates: number[][] = [];
    const altitudes: number[] = [];
    const bearings: number[] = [];
  
    for (let i = 0; i <= steps; i++) {
      const fraction = i / steps;
  
      const point = turf.along(line, distance * fraction, { units: 'kilometers' });
      coordinates.push(point.geometry.coordinates);
  
      const altitude = startPoint.properties.altitude +
        (endPoint.properties.altitude - startPoint.properties.altitude) * fraction;
      altitudes.push(altitude);
  
      const bearing = startPoint.properties.bearing +
        (endPoint.properties.bearing - startPoint.properties.bearing) * fraction;
      bearings.push(bearing);
    }
  
    const animateReal = (i:number) => {
      if (i <= steps) {
        changeModelPosition(
          coordinates[i][1],
          coordinates[i][0],
          altitudes[i],
          bearings[i]
        );
  
        map.current?.easeTo({
          center: coordinates[i] as [number, number],
          duration: 0,
          pitch: 60
        });
  
        
        setTimeout(() => {
          i++;
          animateReal(i);
        }, duration);
      }else{
        if(isPlaying){
          index.current = currentIndex+1;
          setCurrentIndex(currentIndex+1);
        }
      }
    };
  
    animateReal(0);
  };

  useEffect(()=>{
    if(isPlaying==false){
      var p1 = path.features[currentIndex];
      changeModelPosition(
        p1.geometry.coordinates[1],
        p1.geometry.coordinates[0],
        p1.properties.altitude,
        p1.properties.bearing
      );
    }
  },[currentIndex,animationSpeed]);

  useEffect(() => {
    if(isPlaying){
      var p1 = path.features[currentIndex];
      var p2 = path.features[currentIndex+1];
      animateRealFlight(p1, p2);
    }
    
    /*var pathItem = path.features[currentIndex];
    index.current = currentIndex;

    var lng = pathItem.geometry.coordinates[0];
    var lat = pathItem.geometry.coordinates[1];
    var bearing = pathItem.properties.bearing;
    changeModelPosition(pathItem.geometry.coordinates[1], pathItem.geometry.coordinates[0], pathItem.properties.altitude, pathItem.properties.bearing);
    var range:any = getAwesomeRange(pathItem.properties.altitude);
    var calculatedZoom = range.zoom;
    var len = range.len;
    var newCoord = turf.destination(turf.point([lng, lat]), len, bearing, {'units':'meters'});
    map.current?.easeTo({
      center: newCoord.geometry.coordinates as [number, number],
      zoom: calculatedZoom,
      pitch: range.pitch,
      bearing: bearing,
      duration: 0,
      essential: true
    });*/
    /*map.current?.easeTo({
      center: pathItem.geometry.coordinates,
      zoom: range.zoom,
      pitch: 0
    });*/
  }, [currentIndex, animationSpeed]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 text-white text-md p-4 flex items-center justify-between gap-4">
          <div>
            <div>Frame</div>
            <div>{currentIndex}/{path.features.length}</div>
          </div>
          <div>
            <div>Speed</div>
            <div>{path.features[currentIndex]?.properties?.speed.toFixed(2)} knot</div>
          </div>
          <div>
            <div>Bearing</div>
            <div>{path.features[currentIndex]?.properties?.bearing.toFixed(2)}°</div>
          </div>
          <div>
            <div>Altitude</div>
            <div>{path.features[currentIndex]?.properties?.altitude.toFixed(2)} m</div>
          </div>
          <div>
            <div>Date</div>
            <div>{new Date(path.features[currentIndex].properties?.timestamp).toLocaleString()}</div>
          </div>
          <div>
            <div>Lat Lng</div>
            <div>{path.features[currentIndex].geometry.coordinates[1].toFixed(5)}° {path.features[currentIndex].geometry.coordinates[0].toFixed(5)}°</div>
          </div>
          <div>
            <div>Zoom</div>
            <div>{zoomLevel.toFixed(2)}</div>
          </div>
          <div>
            <div>Pitch</div>
            <div>{pitch.toFixed(2)}</div>
          </div>
          <div>
            <div>Dest</div>
            <div>{fark.toFixed(2)}</div>
          </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 p-4 flex items-center gap-4">
        <button 
          onClick={togglePlay}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        
        <input
          type="range"
          min={0}
          max={path.features.length - 1}
          value={currentIndex}
          onChange={handleSliderChange}
          className="flex-1"
        />

        <div className="flex items-center gap-2">
          <span className="text-white">Frame Speed:</span>
          <input
            type="number"
            min="0.1"
            max="10"
            step="0.1"
            value={animationSpeed}
            onChange={handleSpeedChange}
            className="w-12 text-center bg-gray-300 px-2 py-1 rounded"
          />
          <span className="text-white">x</span>
        </div>
      </div>
      
    </div>
  );
};

export default MapboxAnimation;
