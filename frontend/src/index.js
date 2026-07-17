import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ServerErrorPage from './pages/ServerErrorPage';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ErrorBoundary fallback={<ServerErrorPage />}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// ── Smart Service Worker Registration ─────────────────────────────
// We check if the app is running within Capacitor (native mobile app)
const isCapacitor = window.hasOwnProperty('Capacitor') || navigator.userAgent.includes('Capacitor');

if ('serviceWorker' in navigator) {
  if (isCapacitor) {
    // Forcefully find and unregister any active service worker inside the Android app container
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (let registration of registrations) {
        registration.unregister();
        console.log('Successfully unregistered active service worker in Capacitor container.');
      }
    });
  } else {
    // Only register the service worker if running on standard web browsers
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('Service worker registered:', reg.scope))
        .catch(err => console.error('Service worker registration failed:', err));
    });
  }
}