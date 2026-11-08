import {createRoot} from 'react-dom/client';
// Polices embarquées (le jeu doit fonctionner hors ligne : PC, Electron)
import '@fontsource/press-start-2p';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import '@fontsource-variable/plus-jakarta-sans';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
