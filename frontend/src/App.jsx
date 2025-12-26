import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from 'axios'
import io from 'socket.io-client'
import { Toaster } from 'react-hot-toast'

// Pages
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import Dota2StatsPage from './pages/Dota2StatsPage'
import Dota2GlobalStatsPage from './pages/Dota2GlobalStatsPage'
import CS2StatsPage from './pages/CS2StatsPage'
import MemesPage from './pages/MemesPage'
import MusicPage from './pages/MusicPageSpotify'
import MusicHomePage from './pages/MusicHomePage'
import MusicLibraryPage from './pages/MusicLibraryPage'
import MusicSearchPage from './pages/MusicSearchPage'
import MyWave from './pages/MyWave'
import AlbumPage from './pages/AlbumPage'
import PlaylistDetailPage from './pages/PlaylistDetailPageSpotify'
import PlaylistsPage from './pages/PlaylistsPage'
import HallOfFamePage from './pages/HallOfFamePage'
import DownloadPage from './pages/DownloadPage'
import AdminPage from './pages/AdminPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminMemesPage from './pages/AdminMemesPage'
import AdminAchievementsPage from './pages/AdminAchievementsPage'
import AdminAnalyticsPage from './pages/AdminAnalyticsPage'
import AdminBotPage from './pages/AdminBotPage'
import QuestsPage from './pages/QuestsPage'
import NotificationsPage from './pages/NotificationsPage'
import NotFoundPage from './pages/NotFoundPage'

// Components
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ErrorBoundary from './components/ErrorBoundary'
import QuestsSidebar from './components/QuestsSidebar'
import GlobalMusicPlayer from './components/GlobalMusicPlayer'
import { ThemeProvider } from './contexts/ThemeContext'
import { MusicPlayerProvider } from './contexts/MusicPlayerContext'

// API Configuration
import { getApiUrl } from './utils/apiConfig'

const API_URL = getApiUrl()
const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
  path: '/socket.io/'
})

function App() {
  const [serverStatus, setServerStatus] = useState({
    online: false,
    clients: 0,
    maxClients: 32
  })

  useEffect(() => {
    // Fetch initial server status
    const fetchStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/server/status`)
        setServerStatus(response.data)
      } catch (error) {
        console.error('Error fetching server status:', error)
      }
    }

    fetchStatus()

    // Listen to real-time updates
    socket.on('server:status', (data) => {
      setServerStatus(prev => ({ ...prev, ...data }))
    })

    socket.on('server:update', (data) => {
      setServerStatus(prev => ({ ...prev, clients: data.clients }))
    })

    return () => {
      socket.off('server:status')
      socket.off('server:update')
    }
  }, [])

  return (
    <ThemeProvider>
      <MusicPlayerProvider>
        <ErrorBoundary>
          <Router>
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-dark via-dark-light to-dark dark:from-dark dark:via-dark-light dark:to-dark">
              <Navbar serverStatus={serverStatus} />
              <QuestsSidebar />
              
              {/* Toast Notifications */}
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#1f2937',
                    color: '#fff',
                    border: '1px solid #374151',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
              
              <main className="flex-grow pb-24">
                <Routes>
                  <Route path="/" element={<HomePage serverStatus={serverStatus} />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/dota2/:steamId" element={<Dota2StatsPage />} />
                  <Route path="/dota2/global" element={<Dota2GlobalStatsPage />} />
                  <Route path="/cs2/:steamId" element={<CS2StatsPage />} />
                  <Route path="/memes" element={<MemesPage />} />
                  <Route path="/memes/generator" element={<MemesPage />} />
                  
                  {/* Music Routes */}
                  <Route path="/music" element={<MusicHomePage />} />
                  <Route path="/music/search" element={<MusicSearchPage />} />
                  <Route path="/music/wave" element={<MyWave />} />
                  <Route path="/music/library" element={<MusicLibraryPage />} />
                  <Route path="/music/liked" element={<MusicLibraryPage />} />
                  <Route path="/music/recent" element={<MusicLibraryPage />} />
                  <Route path="/music/albums/:id" element={<AlbumPage />} />
                  <Route path="/music/playlists/:id" element={<PlaylistDetailPage />} />
                  <Route path="/music/playlist/:id" element={<PlaylistDetailPage />} />
                  <Route path="/music/playlists" element={<PlaylistsPage />} />
                  
                  <Route path="/quests" element={<QuestsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/hall-of-fame" element={<HallOfFamePage />} />
                  <Route path="/download" element={<DownloadPage />} />
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="/admin/music" element={<AdminPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/memes" element={<AdminMemesPage />} />
                  <Route path="/admin/achievements" element={<AdminAchievementsPage />} />
                  <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
                  <Route path="/admin/bot" element={<AdminBotPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </main>

              <GlobalMusicPlayer />
              <Footer />
            </div>
          </Router>
        </ErrorBoundary>
      </MusicPlayerProvider>
    </ThemeProvider>
  )
}

export default App
