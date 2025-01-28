import { useEffect, useState } from 'react';
import { Path } from '../types';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface ElevationChartProps {
  path: Path;
  currentIndex?: number;
  onHover?: (index: number) => void;
}

const ElevationChart = ({ path, currentIndex, onHover }: ElevationChartProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [chartOptions, setChartOptions] = useState<ApexOptions | null>(null);

  if (!path?.features?.length) return null;

  const altitudeData = path.features.map(feature => feature.properties.altitude);

  useEffect(() => {
    const options: ApexOptions = {
      chart: {
        type: 'area',
        height: 200,
        toolbar: {
          show: true
        },
        animations: {
          enabled: false,
          animateGradually: {
            enabled: false,
            delay: 0
          },
          speed: 0
        },
        zoom: {
          enabled: true,
          type: 'x',
          autoScaleYaxis: true
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 2,
        colors: ['#10B981']
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.6,
          opacityTo: 0.1,
          stops: [0, 100]
        },
        colors: ['#10B981']
      },
      markers: {
        size: 0,
        hover: {
          size: 6,
          sizeOffset: 0
        },
        strokeWidth: 2,
        strokeColors: '#fff',
        discrete: currentIndex !== undefined ? [{
          seriesIndex: 0,
          dataPointIndex: currentIndex,
          size: 6,
          fillColor: '#fff',
          strokeColor: '#10B981',
        }] : []
      },
      grid: {
        borderColor: '#efefef',
        strokeDashArray: 3,
        xaxis: {
          lines: {
            show: false
          }
        },
        yaxis: {
          lines: {
            show: true
          }
        }
      },
      xaxis: {
        type: 'numeric',
        labels: {
          show: false,
        },
        axisTicks: {
          show: false
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: '#fff',
            fontSize: '12px'
          },
          formatter: (value) => `${value.toFixed(0)} m`
        }
      },
      tooltip: {
        enabled: true,
        fixed: {
          enabled: false
        }
      }
    };

    setChartOptions(options);
  }, [path, currentIndex, hoveredIndex]);

  const series = [{
    name: '- Altitude',
    data: altitudeData
  }];

  if (!chartOptions) return null;

  return (
    <div className="w-full h-[200px] mr-2 mt-8  mb-2 flex items-center justify-center">
      <ReactApexChart 
        options={chartOptions}
        series={series}
        type="area"
        height={200}
        width={360}
      />
    </div>
  );
};

export default ElevationChart;
