import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LoaderState {
  text: string | null;
}

const initialState: LoaderState = {
  text: null
};

const loaderSlice = createSlice({
  name: 'loader',
  initialState,
  reducers: {
    setText: (state, action: PayloadAction<string>) => {
      state.text = action.payload;
    },
    clearText: (state) => {
      state.text = null;
    }
  }
});

export const { setText, clearText } = loaderSlice.actions;

export default loaderSlice.reducer;
