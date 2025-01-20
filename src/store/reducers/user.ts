import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// State için TypeScript türü
interface UserState {
  user: { [key: string]: any } | null;  // `user` objesinin yapısına göre burayı detaylandırabilirsiniz
  token: string | null;
  form: { [key: string]: any } | null;  // `form` objesinin yapısına göre burayı detaylandırabilirsiniz
}

// Initial State
const initialState: UserState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  form: JSON.parse(localStorage.getItem('form') || 'null'),
};

const userSlice = createSlice({
  name: 'user',  
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<{ user: { [key: string]: any }, token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;

      // Local Storage'a kaydet
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      localStorage.setItem('token', action.payload.token);
    },
    setForm: (state, action: PayloadAction<{ [key: string]: any }>) => {
      state.form = action.payload;
      localStorage.setItem('form', JSON.stringify(action.payload));
    },
    clearForm: (state) => {
      state.form = null;
      localStorage.removeItem('form');
    },
    clearUser: (state) => {
      state.user = null;
      state.token = null;
      // Local Storage'dan sil
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    },
  },
});

export const { setUser, clearUser, setForm, clearForm } = userSlice.actions;

export default userSlice.reducer;
