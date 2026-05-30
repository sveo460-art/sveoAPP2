import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Capacitor } from '@capacitor/core';

// Intercept local API calls on Android and route them to our hosted backend URL
if (Capacitor.isNativePlatform()) {
  const BASE_URL = 'https://ais-pre-nolu2zj2ynkrb5v26gsomi-432887406936.asia-southeast1.run.app';
  
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string' && input.startsWith('/api')) {
      return originalFetch(BASE_URL + input, init);
    }
    return originalFetch(input, init);
  };

  const OriginalEventSource = window.EventSource;
  window.EventSource = class extends OriginalEventSource {
    constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
      if (typeof url === 'string' && url.startsWith('/api')) {
        super(BASE_URL + url, eventSourceInitDict);
      } else {
        super(url, eventSourceInitDict);
      }
    }
  } as any;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
