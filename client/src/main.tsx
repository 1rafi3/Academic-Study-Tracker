import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.js'
import { ThemeProvider } from './context/ThemeContext.js'
import { UIThemeProvider } from './context/UIThemeContext.js'
import { ToastProvider } from './context/ToastContext.js'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <UIThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </UIThemeProvider>
    </ThemeProvider>
  </StrictMode>,
)

