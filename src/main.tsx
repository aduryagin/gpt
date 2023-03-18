import ReactDOM from 'react-dom/client';
import App from './App';
import { SettingsProvider } from './hooks';
import './db';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  // <React.StrictMode>
  <SettingsProvider>
    <App />
  </SettingsProvider>,
  // </React.StrictMode>,
);
