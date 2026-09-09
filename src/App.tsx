import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ConfigGate } from './app/ConfigGate'
import { AppRoutes } from './app/AppRoutes'

function App() {
  return (
    <ConfigGate>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ConfigGate>
  )
}

export default App
