import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// yo dis is where it all begins fr fr
// we grabbin the root element and rizzing it up with react
createRoot(document.getElementById('root')!).render(
  // strict mode is like that one strict teacher but for code
  <StrictMode>
    <App />
  </StrictMode>,
)
