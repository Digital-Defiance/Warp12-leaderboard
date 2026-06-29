import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { installHttpErrorCapture } from './firebase/http-error-capture.js';
import App from './app/app';

installHttpErrorCapture();

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
