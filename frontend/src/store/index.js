import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import documentReducer from './documentSlice';
import themeReducer from './themeSlice';
import collaborationReducer from './collaborationSlice';
import notificationReducer from './notificationSlice';
import chatReducer from './chatSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    document: documentReducer,
    theme: themeReducer,
    collaboration: collaborationReducer,
    notifications: notificationReducer,
    chat: chatReducer,
  },
});

export default store;
