import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './Login.jsx';
import './cafe.css';
import { initializeEngine } from './c-engine.js';
import engineUrl from './native/cafe.wasm?url';

async function start() {
  const response = await fetch(engineUrl);
  if (!response.ok) throw new Error('C engine download failed');
  await initializeEngine(await response.arrayBuffer());
  createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
}
start().catch(error => {
  console.error(error);
  document.getElementById('root').textContent = '게임 엔진을 불러오지 못했어요. 새로고침해 주세요.';
});
