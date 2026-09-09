import React from 'react';
const savedAccent = localStorage.getItem('dh-accent');
if (savedAccent) document.documentElement.style.setProperty('--primary', savedAccent);
const savedCompact = localStorage.getItem('dh-compact') === '1';
if (savedCompact) document.documentElement.style.setProperty('--radius', '10px');
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './AuthContext.jsx';
import { ToastProvider } from './ToastContext.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/react-migration">
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/react-migration/service-worker.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
