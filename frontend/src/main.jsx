import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './App.css';
import { Provider } from 'react-redux';
import store from './store/index.js';
import { preconnectApi } from './lib/prefetch.js';

// Opens the API connection while React is still mounting.
preconnectApi();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);