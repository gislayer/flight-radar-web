import { useEffect, useState } from 'react';
import { FlightData, PathFeature, Pilot } from '../types';
import PlaneSlider from './PlaneSlider';
import * as turf from '@turf/turf';
import ElevationChart from './ElevationChart';
import { useDispatch } from 'react-redux';
import { setPilot } from '../store/reducers/chatpilot';

interface InfoCardProps {
  data: FlightData | null;
  onChange: (p: PathFeature) => void;
  onClose: () => void;
  events:(type:string, data:any)=>void;
}

const InfoCard = ({ data, onChange, onClose, events }: InfoCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pathIndex, setPathIndex] = useState<number>(0);
  const [currentAltitude, setCurrentAltitude] = useState<number>(0);
  const [distanceTraveled, setDistanceTraveled] = useState<number>(0);
  const dispatch = useDispatch();
  const start_airport = data?.start_airport?.name?.split(' ').map(word => word.charAt(0).toUpperCase()).join('');
  const finish_airport = data?.finish_airport?.name?.split(' ').map(word => word.charAt(0).toUpperCase()).join('');

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
    onClose();
  };

  const setPilotChatPanel = (pilot:Pilot)=>{
    dispatch(setPilot(pilot));
    document.dispatchEvent(new Event('pilot_clicked'));
  }

  if (!data) return null;

  return (
    <div className={`sidebar-container bg-gray-700 bg-opacity-70 backdrop-blur-xl ${isOpen ? 'open' : ''}`}>
      <div className='flex flex-row justify-between items-center bg-gray-900'>
        <div className='text-md pl-3 text-green-500'>{data.aircraft.aircraftType.name} - {data.aircraft.name.split('').slice(0, 5).join('')}</div>
        <button className="py-2 px-4 text-white hover:text-amber-500 text-2xl rounded-md" onClick={handleClose}>×</button>
      </div>

      <div style={{ backgroundImage: `url(/sky/${randomImage})` }} className='bg-cover bg-center h-[200px] p-2 w-full flex justify-center items-center'>
        <img style={{width: '80%'}} src={`/aircrafts/${data.aircraft.aircraftTypeId}.png`} alt={data.aircraft.aircraftType.name} className='filter drop-shadow-[0_0_10px_rgba(255,255,255,1)]' />
      </div>
      <div className='flex p-1 flex-row justify-between items-center'>
        <div className='p-1'><img style={{height:'30px'}} src={'/icons/airport-tower.svg'}/></div>
        <div className='flex-1  mx-3 mr-2'>
          <PlaneSlider value={pathIndex} min={0} max={data.path.features?.length-1} step={1} onChange={(value) => setPathIndex(value)} />
        </div>
        <div style={{width:'100px'}} className='flex gap-1 items-center'>
          <div className="w-2 h-2 rounded-full bg-amber-500 border-2 border-amber-500 animate-[pulse_600ms_ease-in-out_infinite]"></div>
          <div className="w-2 h-2 rounded-full bg-amber-500 border-2 border-amber-500 animate-[pulse_800ms_ease-in-out_infinite]"></div>
          <div className="w-2 h-2 rounded-full bg-amber-500 border-2 border-amber-500 animate-[pulse_1000ms_ease-in-out_infinite]"></div>
          <div className='text-md text-white ml-1 font-bold'>{percentage}%</div>
        </div>
        
      </div>
      <div className='w-full h-[200px] flex items-center justify-center'>
        <ElevationChart path={data.path} currentIndex={pathIndex} onClick={(index) => setPathIndex(index)} />
      </div>

      <div className='flex flex-row justify-between items-center p-2'>
        <div className='text-xs text-white ml-1'>Distance: {distanceTraveled.toFixed(2)} km</div>
        <div className='text-xs text-white ml-1'>Altitude: {currentAltitude.toFixed(0)} m</div>
      </div>

      <div className='flex flex-col p-4 gap-2'>

        <div className='flex flex-row justify-between gap-2'>
          <div onClick={()=>events('start_airport_clicked', data.start_airport)} className='text-slate-300 select-none cursor-pointer hover:bg-slate-800 bg-slate-800 bg-opacity-50 p-2 rounded-md w-[50%] text-center flex flex-col items-center'>
          <div className='text-slate-400 mb-1' style={{fontSize: '10px'}}>DEPARTURE AIRPORT</div>
            <div className='text-3xl'>{start_airport}</div>
            
            <div className='text-slate-500 truncate' style={{fontSize: '9px'}}>{data.start_airport.name.slice(0,data.start_airport.name.length>25?25:data.start_airport.name.length)}</div>
          </div>
          <div onClick={()=>events('finish_airport_clicked', data.finish_airport)} className='text-slate-300 select-none cursor-pointer hover:bg-slate-800 bg-slate-800 bg-opacity-50 p-2 rounded-md w-[50%] text-center flex flex-col items-center'>
          <div className='text-slate-400 mb-1' style={{fontSize: '10px'}}>ARRIVAL AIRPORT</div>
            <div className='text-3xl'>{finish_airport}</div>
            
            <div className='text-slate-500 w-fit truncate' style={{fontSize: '9px'}}>{data.finish_airport.name.slice(0,data.finish_airport.name.length>25?25:data.finish_airport.name.length)}</div>
          </div>
        </div>

        <div className='flex flex-row justify-between gap-2'>
          <div onClick={()=>events('start_airport_clicked', data.start_airport)} className='text-slate-300 select-none hover:bg-slate-800 bg-slate-800 bg-opacity-50 p-2 rounded-md w-[50%] text-center flex flex-col items-center'>
          <div className='text-cyan-500 mb-1' style={{fontSize: '10px'}}>ALTITUDE</div>
            <div className='text-cyan-500 text-xl'>{data.altitude.toFixed(2)} m</div>
          </div>
          <div onClick={()=>events('finish_airport_clicked', data.finish_airport)} className='text-slate-300 select-none hover:bg-slate-800 bg-slate-800 bg-opacity-50 p-2 rounded-md w-[50%] text-center flex flex-col items-center'>
          <div className='text-green-600 mb-1' style={{fontSize: '10px'}}>SPEED</div>
            <div className='text-green-600 text-xl'>{data.speed.toFixed(2)} km/h</div>
          </div>
        </div>
        <div className='flex flex-row justify-between gap-2'>
          <div onClick={()=>events('start_airport_clicked', data.start_airport)} className='text-slate-300 select-none hover:bg-slate-800 bg-slate-800 bg-opacity-50 p-2 rounded-md w-[50%] text-center flex flex-col items-center'>
          <div className='text-amber-400 mb-1' style={{fontSize: '10px'}}>AZIMUTH</div>
            <div className='text-amber-400 text-xl'>{data.bearing.toFixed(2)} °</div>
          </div>
          <div onClick={()=>events('finish_airport_clicked', data.finish_airport)} className='text-slate-300 select-none hover:bg-slate-800 bg-slate-800 bg-opacity-50 p-2 rounded-md w-[50%] text-center flex flex-col items-center'>
          <div className='text-red-400 mb-1' style={{fontSize: '10px'}}>PILOT</div>
            <div className='text-red-400 text-xl'>{data.pilot.name}</div>
          </div>
        </div>

        <div className='flex flex-row justify-between gap-2'>
          <button onClick={()=>setPilotChatPanel(data.pilot)} className="bg-green-600 w-full hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md mt-2">
            Contact Pilot
          </button>
        </div>

      </div>
      
      <div>
        
      </div>

    </div>
  );
};

export default InfoCard;