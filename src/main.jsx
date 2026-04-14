import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const debug = document.getElementById('debug')
if (debug) debug.innerHTML += '<br>✅ main.jsx loaded'

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  if (debug) debug.innerHTML += '<br> YES React mounted'
} catch(e) {
  if (debug) debug.innerHTML += '<br>❌ React error: ' + e.message
  console.error(e)
}
