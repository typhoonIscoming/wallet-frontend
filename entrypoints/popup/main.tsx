import { Buffer } from 'buffer';

// 在全局作用域提供 Buffer polyfill
if (typeof globalThis.Buffer === 'undefined') {
	globalThis.Buffer = Buffer;
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
