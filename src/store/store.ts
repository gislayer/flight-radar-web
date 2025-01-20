import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { createEncryptor } from '../utils/encryptor';

// reducers
import userReducer from './reducers/user';

// rootReducer'ı combineReducers ile birleştiriyoruz
const rootReducer:any = combineReducers({
  user: userReducer,
});

const persistConfig = {
  key: 'root',
  storage,
  transforms: [createEncryptor()],
  blacklist:['globalObject']
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Bu eylemleri seri hale getirme kontrolünden muaf tut
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

export const persistor = persistStore(store);
export default store;
