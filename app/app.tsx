import { HashRouter, Route, Routes } from 'react-router-dom'

import { AuthGate } from './components/auth/AuthGate'
import { Toaster } from './components/ui/sonner'
import { Layout } from './pages/Layout'
import { Main } from './pages/Main'
import { SignInPage } from './pages/SignInPage'

export default function App() {
  return (
    <HashRouter>
      <div className="h-full min-h-0">
        <Routes>
          <Route path="/sign-in" element={<SignInPage />} />
          <Route
            path="/*"
            element={
              <AuthGate>
                <Layout>
                  <Main />
                </Layout>
              </AuthGate>
            }
          />
        </Routes>
        <Toaster />
      </div>
    </HashRouter>
  )
}
