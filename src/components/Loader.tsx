import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

const Loader = () => {
  const loaderText = useSelector((state: RootState) => state.loader.text);
  if(!loaderText){
    return null;
  }
  return (
    <div className="loader-container">
      <div className="loader-content">
        <div className="loader-spinner"></div>
        <div className="loader-text">
          {loaderText || 'Please Wait..'}
        </div>
      </div>
    </div>
  );
};

export default Loader;
