
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/documents/notifications');
      return response.data.notifications;
    } catch (error) {
      const fallback = {
        message: error.message || 'Unable to load notifications'
      };
      return rejectWithValue(error.response?.data || fallback);
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/documents/notifications/${notificationId}`);
      return response.data.notification;
    } catch (error) {
      const fallback = {
        message: error.message || 'Unable to update notification'
      };
      return rejectWithValue(error.response?.data || fallback);
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    loading: false,
    error: null
  },
  reducers: {
    clearNotificationState: (state) => {
      state.items = [];
      state.error = null;
      state.loading = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const updated = action.payload;
        state.items = state.items.map((item) =>
          item._id === updated._id ? { ...item, ...updated } : item
        );
      })
      .addCase(markNotificationRead.rejected, (state, action) => {
        state.error = action.payload;
      });
  }
});

export const { clearNotificationState } = notificationSlice.actions;
export default notificationSlice.reducer;
