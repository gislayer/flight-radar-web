import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Pilot } from '../../types';

interface ChatPilotState {
  pilots: Record<number, Pilot>;
}

const initialState: ChatPilotState = {
  pilots: {}
};

const chatPilotSlice = createSlice({
  name: 'chatpilot',
  initialState,
  reducers: {
    setPilot: (state, action: PayloadAction<Pilot>) => {
      state.pilots[action.payload.id] = action.payload;
    },
    clearPilot: (state, action: PayloadAction<number>) => {
      delete state.pilots[action.payload];
    }
  }
});

export const { setPilot, clearPilot } = chatPilotSlice.actions;

export default chatPilotSlice.reducer;
