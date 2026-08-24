import { Routes, Route } from 'react-router-dom'

import { ProtectedRoute } from './auth/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Home } from './pages/Home'
import { AdminUsers } from './pages/admin/Users'
import { GamesList } from './pages/games/GamesList'
import { GameDetail } from './pages/games/GameDetail'
import { AddGame } from './pages/games/AddGame'
import { EditGame } from './pages/games/EditGame'
import { TeamsIndex } from './pages/teams/TeamsIndex'
import { TeamPage } from './pages/teams/TeamPage'
import { PlayersIndex } from './pages/players/PlayersIndex'
import { PlayerPage } from './pages/players/PlayerPage'
import { PlacesIndex } from './pages/places/PlacesIndex'
import { PlacePage } from './pages/places/PlacePage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/games" element={<GamesList />} />
        <Route path="/games/new" element={<AddGame />} />
        <Route path="/games/:id" element={<GameDetail />} />
        <Route path="/games/:id/edit" element={<EditGame />} />
        <Route path="/teams" element={<TeamsIndex />} />
        <Route path="/teams/:id" element={<TeamPage />} />
        <Route path="/players" element={<PlayersIndex />} />
        <Route path="/players/:id" element={<PlayerPage />} />
        <Route path="/places" element={<PlacesIndex />} />
        <Route path="/places/:id" element={<PlacePage />} />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute adminOnly>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}

export default App
