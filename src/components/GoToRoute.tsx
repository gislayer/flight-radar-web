import { FC } from 'react';
import {message} from 'antd';
interface GoToRouteProps {
  onSearch: (routeId: number) => void;
}

const GoToRoute: FC<GoToRouteProps> = ({ onSearch }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).routeId;
    if(input.value==""){
      message.warning("Please write a valid route id");
      return false;
    }
    onSearch(parseInt(input.value));
  };

  return (
    <form onSubmit={handleSubmit} className="fixed top-3 right-10 flex gap-2">
      <input
        type="number"
        name="routeId"
        style={{border:'1px solid #999'}}
        placeholder="Enter Route ID"
        className="p-[5px] border bg-gray-700 text-white outline-none border-gray-500 rounded-md text-sm h-11"
      />
      <button 
        type="submit"
        className="bg-gray-800 text-white px-4 rounded p-[4px] text-sm hover:bg-gray-600"
      >
        Find Route
      </button>
    </form>
  );
};

export default GoToRoute;
