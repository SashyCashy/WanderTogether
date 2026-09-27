import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './shared/tokens.css';
import './shared/a11y.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
