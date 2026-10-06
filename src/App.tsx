import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import PageEditor from './pages/PageEditor'
import GreetingView from './pages/GreetingView'
import ContributePage from './pages/ContributePage'

/**
 * Routes:
 *   /                     landing
 *   /admin                login (or redirect to dashboard when authed)
 *   /admin/new            create a greeting page
 *   /admin/edit/:id       edit an existing page
 *   /g/:token             VIEW-ONLY public link
 *   /c/:token             CONTRIBUTE public link
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/admin" element={<Dashboard />} />
      <Route path="/admin/new" element={<PageEditor />} />
      <Route path="/admin/edit/:id" element={<PageEditor />} />
      <Route path="/g/:token" element={<GreetingView />} />
      <Route path="/c/:token" element={<ContributePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
