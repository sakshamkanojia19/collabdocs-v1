import { createSlice } from '@reduxjs/toolkit';

const getInitialTheme = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedTheme = window.localStorage.getItem('theme');
    if (['light', 'dark', 'system'].includes(storedTheme)) {
      return storedTheme;
    }
  }
  return 'light';
};

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    currentTheme: getInitialTheme(),
  },
  reducers: {
    setTheme: (state, action) => {
      state.currentTheme = action.payload;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('theme', action.payload);
      }
    },
    toggleTheme: (state) => {
      const sequence = ['light', 'dark', 'system'];
      const currentIndex = sequence.indexOf(state.currentTheme);
      const newTheme = sequence[(currentIndex + 1) % sequence.length];
      state.currentTheme = newTheme;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('theme', newTheme);
      }
    },
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;


