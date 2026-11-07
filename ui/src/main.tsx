import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { applyAccent, readStoredAccent } from './theme/accent';
import { applyTheme, readStoredTheme } from './theme/theme';
import { useLocaleStore } from './stores/useLocaleStore';

const theme = readStoredTheme();
applyTheme(theme);
applyAccent(readStoredAccent(), theme);
useLocaleStore.getState();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
