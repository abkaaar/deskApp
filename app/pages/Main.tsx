import { Routes, Route } from 'react-router-dom'
import { HomePage } from './Home'
import { TasksPage } from './TasksPage'
import { SettingsPage } from './SettingsPage'

export function Main() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  )
}
