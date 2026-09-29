// Ensure window.fetch is writable before any library initializations
try {
  if (typeof window !== 'undefined' && window.fetch) {
    const nativeFetch = window.fetch.bind(window);
    Object.defineProperty(window, 'fetch', {
      value: nativeFetch,
      writable: true,
      configurable: true,
    });
  }
} catch {}

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
