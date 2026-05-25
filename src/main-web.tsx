import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WebApp } from './web/WebApp';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WebApp />
  </StrictMode>
);
