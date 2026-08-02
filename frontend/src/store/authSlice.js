import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// Async thunks for authentication
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData);
      const payload = response.data?.data ?? response.data;
      localStorage.setItem('token', payload.token);
      return payload;
    } catch (error) {
      const fallback = {
        message: error.message || 'Unable to register at this time'
      };
      return rejectWithValue(error.response?.data || fallback);
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', userData);
      const payload = response.data?.data ?? response.data;
      localStorage.setItem('token', payload.token);
      return payload;
    } catch (error) {
      const fallback = {
        message: error.message || 'Unable to login at this time'
      };
      return rejectWithValue(error.response?.data || fallback);
    }
  }
);

// Refreshes the plan context after account changes (seat edits, admin grants)
// without re-running the whole session bootstrap.
export const refreshAccount = createAsyncThunk(
  'auth/refreshAccount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/account');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Unable to load account' });
    }
  }
);

export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return rejectWithValue({ code: 'NO_TOKEN' });
      }
      const response = await api.get('/auth/me');
      const payload = response.data?.data ?? response.data;
      return payload.user
        ? payload
        : { user: payload, account: null, entitlements: null };
    } catch (error) {
      localStorage.removeItem('token');
      return rejectWithValue(error.response?.data || { message: 'Unable to load user' });
    }
  }
);

const storedToken = localStorage.getItem('token');

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: storedToken,
    isAuthenticated: null,
    // Only block the first paint when there is actually a session to verify.
    // Anonymous visitors reach the sign-in form on the first frame.
    loading: Boolean(storedToken),
    // Submitting is tracked separately so a sign-in attempt never unmounts the
    // form it was submitted from.
    submitting: false,
    user: null,
    account: null,
    entitlements: null,
    error: null,
  },
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token');
      state.token = null;
      state.isAuthenticated = false;
      state.user = null;
      state.account = null;
      state.entitlements = null;
      state.error = null;
      state.loading = false;
      state.submitting = false;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.submitting = false;
        state.user = action.payload.user;
        state.account = action.payload.account || null;
        state.entitlements = action.payload.entitlements || null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.token = null;
        state.isAuthenticated = false;
        state.submitting = false;
        state.user = null;
        state.error = action.payload;
      })
      .addCase(loginUser.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.submitting = false;
        state.user = action.payload.user;
        state.account = action.payload.account || null;
        state.entitlements = action.payload.entitlements || null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.token = null;
        state.isAuthenticated = false;
        state.submitting = false;
        state.user = null;
        state.error = action.payload;
      })
      .addCase(loadUser.pending, (state) => {
        // Without a stored token there is nothing to verify, so the sign-in form
        // must not be gated behind a loading state that will resolve immediately.
        state.loading = Boolean(state.token);
        state.error = null;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.loading = false;
        state.user = action.payload.user;
        state.account = action.payload.account || null;
        state.entitlements = action.payload.entitlements || null;
      })
      .addCase(refreshAccount.fulfilled, (state, action) => {
        state.account = action.payload.account || state.account;
        state.entitlements = action.payload.entitlements || state.entitlements;
      })
      .addCase(loadUser.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload?.code === 'NO_TOKEN' ? null : action.payload;
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
