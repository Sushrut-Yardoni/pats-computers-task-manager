import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent intrusive browser popup dialogs everywhere (satisfies: 'remove this pop from everywhere')
if (typeof window !== "undefined") {
  window.alert = (msg?: any) => {
    console.info("[Notice]:", msg);
  };

  // Register PWA service worker for Android mobile notifications, Desktop PWA and background capability
  if ('serviceWorker' in navigator) {
    const registerSW = () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[PWA SW] Registered successfully with scope:', reg.scope);
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('[PWA SW] Registration failed:', err);
        });
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
