import React from 'react';
import { createRoot } from 'react-dom/client';
import Chat from './Pages/Chat';
import '../css/app.css';

const el = document.getElementById('app');
if (el) {
    const root = createRoot(el);
    root.render(<Chat />);
}
