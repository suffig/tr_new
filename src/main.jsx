import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import './styles/globals.css'
import './styles/ea-sports-cards.css'
import './styles/modern-design.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Ueber App, weil App selbst useAuth() aufruft. */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)