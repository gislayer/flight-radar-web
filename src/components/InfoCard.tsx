import { useEffect, useState } from 'react';
import { FlightData, PathFeature } from '../types';
import PlaneSlider from './PlaneSlider';
import * as turf from '@turf/turf';
import ElevationChart from './ElevationChart';

interface InfoCardProps {
  data: FlightData | null;
  onChange: (p: PathFeature) => void;
}

const InfoCard = ({ data, onChange }: InfoCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pathIndex, setPathIndex] = useState<number>(0);
  const [currentAltitude, setCurrentAltitude] = useState<number>(0);
  const [distanceTraveled, setDistanceTraveled] = useState<number>(0);

  useEffect(() => {
    if (data?.path?.features?.length) {
      setPathIndex(data.path.features.length - 1);
    }
  }, [data]);

  const bgImages = ['1.jpg', '2.png', '3.jpg', '4.jpg', '5.jpg', '6.avif', '7.jpg', '8.jpg', '9.jpg', '10.jpg', 
    '11.jpg', '12.jpg', '13.jpg', '14.jpg', '15.jpg', '16.webp', '17.jpg', '18.jpg', '19.webp', '20.jpg', '21.jpeg', '22.jpeg'];
  const randomImage = data?.aircraft?.id !== undefined ? bgImages[data.aircraft.id % bgImages.length] : bgImages[0];

  const start = data?.start_airport?.geometry;
  const finish = data?.finish_airport?.geometry;
  var total_length:number = start && finish ? turf.distance(
    turf.point(start.coordinates), 
    turf.point([finish.coordinates[0], finish.coordinates[1]]), 
    {units: 'kilometers'}
  ) : 0;

  var last_point = data?.path?.features[data?.path?.features?.length-1]?.geometry;
  var last_point_distance = last_point && start ? turf.distance(
    turf.point(start.coordinates), 
    turf.point(last_point.coordinates), 
    {units: 'kilometers'}
  ) : 0;
  last_point_distance = Number(last_point_distance.toFixed(0));
  var percentage = (last_point_distance / total_length) * 100;
  percentage = Number(percentage.toFixed(2));

  useEffect(() => {
    if (data) {
      setIsOpen(true);
    }
  }, [data]);

  useEffect(() => {
    if (data?.path?.features?.length) {
      setPathIndex(data.path.features.length - 1);
    }
  }, [data]);



  useEffect(() => {
    if (data?.path?.features && pathIndex >= 0) {
      // Mevcut irtifayı al
      const altitude = data.path.features[pathIndex].properties.altitude;
      setCurrentAltitude(altitude);
      var feature = data.path.features[pathIndex];
      feature.properties['type'] = data.aircraft.aircraftTypeId;
      onChange(data.path.features[pathIndex]);

      // Başlangıç noktasından şimdiye kadar gidilen mesafeyi hesapla
      if (data.start_airport?.geometry) {
        const currentPoint = data.path.features[pathIndex].geometry;
        const distance = turf.distance(
          turf.point(data.start_airport.geometry.coordinates),
          turf.point(currentPoint.coordinates),
          {units: 'kilometers'}
        );
        setDistanceTraveled(Number(distance.toFixed(1)));
      }
    }
  }, [pathIndex, data]);

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!data) return null;

  return (
    <div className={`sidebar-container ${isOpen ? 'open' : ''}`}>
      <div className='flex flex-row justify-between items-center bg-gray-900'>
        <div className='text-md pl-3 text-green-500'>{data.aircraft.aircraftType.name} - {data.aircraft.name.split('').slice(0, 5).join('')}</div>
        <button className="py-2 px-4 text-white hover:text-amber-500 text-2xl rounded-md" onClick={handleClose}>×</button>
      </div>

      <div style={{ backgroundImage: `url(/sky/${randomImage})` }} className='bg-cover bg-center h-[200px] p-2 w-full flex justify-center items-center'>
        <img style={{width: '80%'}} src={`/aircrafts/${data.aircraft.aircraftTypeId}.png`} alt={data.aircraft.aircraftType.name} />
      </div>
      <div className='flex bg-gray-700 p-1 flex-row justify-between items-center'>
        <div className='p-1'><img style={{height:'30px'}} src={'/aircrafts/airport2.png'}/></div>
        <div className='flex-1 border-b border-gray-500 mx-3 mr-2'>
          <PlaneSlider value={pathIndex} min={0} max={data.path.features?.length-1} step={1} onChange={(value) => setPathIndex(value)} />
        </div>
        <div style={{width:'100px'}} className='flex gap-1 items-center'>
          <div className="w-2 h-2 rounded-full bg-amber-500 border-2 border-amber-500 animate-[pulse_600ms_ease-in-out_infinite]"></div>
          <div className="w-2 h-2 rounded-full bg-amber-500 border-2 border-amber-500 animate-[pulse_800ms_ease-in-out_infinite]"></div>
          <div className="w-2 h-2 rounded-full bg-amber-500 border-2 border-amber-500 animate-[pulse_1000ms_ease-in-out_infinite]"></div>
          <div className='text-md text-white ml-1 font-bold'>{percentage}%</div>
        </div>
        
      </div>
      <div className='w-full h-[200px] flex items-center justify-center bg-gray-600'>
        <ElevationChart path={data.path} currentIndex={pathIndex} onHover={(index) => setPathIndex(index)} />
      </div>

      <div className='flex flex-row justify-between items-center bg-gray-700 p-2'>
        <div className='text-xs text-white ml-1'>Distance: {distanceTraveled.toFixed(2)} km</div>
        <div className='text-xs text-white ml-1'>Altitude: {currentAltitude.toFixed(0)} m</div>
      </div>

      
      <div className="info-content">
        <div className="info-row">
          <h3>Uçuş Bilgileri</h3>
          <p>ID: {data.id}</p>
          <p>Son Güncelleme: {new Date(data.last_update_date).toLocaleString('tr-TR')}</p>
          <p>Durum: {data.status ? 'Aktif' : 'Pasif'}</p>
          <p>Hız: {data.speed} knot</p>
          <p>İrtifa: {data.altitude} ft</p>
          <p>Yön: {data.bearing}°</p>
        </div>

        <div className="info-row">
          <h3>Havaalanı Bilgileri</h3>
          <p>Kalkış: {data.start_airport.name}</p>
          <p>Varış: {data.finish_airport.name}</p>
        </div>

        <div className="info-row">
          <h3>Pilot Bilgisi</h3>
          <p>{data.pilot.name}</p>
        </div>

        <div className="info-row">
          <h3>Uçak Bilgileri</h3>
          <p>Uçak: {data.aircraft.name}</p>
          <p>Tip: {data.aircraft.aircraftType.name}</p>
        </div>
      </div>
      
    </div>
  );
};

export default InfoCard;