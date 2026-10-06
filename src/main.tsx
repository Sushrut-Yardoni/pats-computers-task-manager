import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent intrusive browser popup dialogs everywhere (satisfies: 'remove this pop from everywhere')
if (typeof window !== "undefined") {
  window.alert = (msg?: any) => {
    console.info("[Notice]:", msg);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
