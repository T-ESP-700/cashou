import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { trpc, trpcClient, queryClient } from './lib/trpc'

const root = ReactDOM.createRoot(document.getElementById('root')!)

root.render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <App />
    </trpc.Provider>
  </React.StrictMode>
)
