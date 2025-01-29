import ReactDOM from 'react-dom/client';
import { HashRouter as  Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import store,{persistor} from './store/store';
import './locales/i18n'
import './index.css';

import NotFound from './pages/NotFound';
import { useTranslation } from 'react-i18next';
import OpenLayersMap from './pages/openlayers/OpenLayersMap';
import Loader from './components/Loader';

function Main() {
  const { t } = useTranslation();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<OpenLayersMap />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <Provider store={store}>
      <Loader />
      <PersistGate loading={null} persistor={persistor}>
        <Main />
      </PersistGate>
    </Provider>
);
