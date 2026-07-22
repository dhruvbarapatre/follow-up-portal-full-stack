import { createSlice } from '@reduxjs/toolkit';

interface UiState {
  openModals: number;
}

const initialState: UiState = {
  openModals: 0,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    modalOpened(state) {
      state.openModals += 1;
    },
    modalClosed(state) {
      state.openModals = Math.max(0, state.openModals - 1);
    },
  },
});

export const { modalOpened, modalClosed } = uiSlice.actions;
export default uiSlice.reducer;
