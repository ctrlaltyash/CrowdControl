import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './dashboard-theme.css'
import App from './App'

// Initialize the React application and attach it to the root DOM node.
// Uses createRoot for React 18 concurrent features.
createRoot(document.getElementById('root')!).render(
  // Enforce StrictMode to highlight potential problems in the application during development.
  <StrictMode>
    <App />
  </StrictMode>,
)
