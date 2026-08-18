import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import App from './App.jsx';
import './styles/app.css';

/**
 * Register the service worker — this is what makes the app open with no signal
 * and launch instantly from the home screen. `virtual:pwa-register` is supplied
 * by vite-plugin-pwa at build time; it isn't a file on disk, which is why your
 * editor may underline it.
 */
registerSW({ immediate: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
