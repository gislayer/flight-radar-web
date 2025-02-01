import { useEffect, useState } from 'react';

interface PlaneSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

const PlaneSlider = ({ value, min, max, step, onChange }: PlaneSliderProps) => {
  const [sliderValue, setSliderValue] = useState<number>(value);
  
  useEffect(()=>{
    onChange(sliderValue);
  },[sliderValue])

  useEffect(()=>{
    setSliderValue(value);
  },[value])

  const percentage = ((sliderValue - min) / (max - min)) * 100;

  return (
    <div className="relative w-full h-12 flex items-center">
      <div className="absolute w-full h-2 rounded-full overflow-hidden">
        <div 
          className="h-full bg-green-500"
          style={{ width: `${percentage}%` }}
        />
        <div 
          className="absolute top-0 h-full bg-amber-500"
          style={{ left: `${percentage}%`, right: 0 }}
        />
      </div>
      
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onChange={(e:any)=>{setSliderValue(Number(e.target.value))}}
        className="plane-slider"
      />
    </div>
  );
};

export default PlaneSlider;
