import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';
import './css/colors.css';

const root = document.getElementById('root');
if (root != null) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
