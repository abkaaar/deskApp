import { BrowserRouter } from 'react-router-dom'
import { Layout } from './pages/Layout'
import { Main } from './pages/Main'
import { Toaster } from './components/ui/sonner'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Main />
      <Toaster/>
      </Layout>
    </BrowserRouter>
  )
}
