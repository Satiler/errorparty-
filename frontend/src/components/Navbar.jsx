import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaMicrophone, FaUsers, FaFire, FaSteam, FaUser, FaSignOutAlt, FaCog, FaBars, FaTimes, FaTrophy, FaImage, FaMusic, FaDownload } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'
import ThemeToggle from './ThemeToggle'
import { apiFetch } from '../utils/apiConfig'

export default function Navbar({ serverStatus }) {
  const [user, setUser] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Check for token in URL (after Steam redirect)
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    
    if (token) {
      localStorage.setItem('token', token)
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname)
      verifyToken(token)
    } else {
      // Check existing token
      const existingToken = localStorage.getItem('token')
      if (existingToken) {
        verifyToken(existingToken)
      }
    }
  }, [])

  const verifyToken = async (token) => {
    try {
      const response = await apiFetch('/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setUser(data.user)
      } else {
        localStorage.removeItem('token')
      }
    } catch (err) {
      console.error('Token verification failed:', err)
      localStorage.removeItem('token')
    }
  }

  const handleLogin = () => {
    window.location.href = '/api/auth/steam'
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setMobileMenuOpen(false)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <>
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-white dark:bg-dark-light border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 backdrop-blur-sm bg-opacity-95"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group" onClick={closeMobileMenu}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-neon-cyan to-neon-purple rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <FaMicrophone className="text-white text-base sm:text-xl" />
              </div>
              <span className="text-xl sm:text-2xl font-display font-bold bg-gradient-to-r from-neon-cyan to-neon-pink bg-clip-text text-transparent">
                ErrorParty
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center space-x-8">
              <Link to="/" className="text-gray-700 dark:text-gray-300 hover:text-neon-cyan transition-colors font-medium">
                Главная
              </Link>
              <Link to="/dashboard" className="text-gray-700 dark:text-gray-300 hover:text-neon-cyan transition-colors font-medium">
                Dashboard
              </Link>
              <Link to="/music" className="text-gray-700 dark:text-gray-300 hover:text-neon-cyan transition-colors font-medium flex items-center gap-1">
                <FaMusic className="text-sm" />
                Музыка
              </Link>
              <Link to="/memes" className="text-gray-700 dark:text-gray-300 hover:text-neon-cyan transition-colors font-medium">
                Мемы
              </Link>
              <Link to="/hall-of-fame" className="text-gray-700 dark:text-gray-300 hover:text-neon-cyan transition-colors font-medium">
                Доска почёта
              </Link>
              <Link 
                to="/download" 
                className="text-gray-700 dark:text-gray-300 hover:text-neon-cyan transition-colors font-medium flex items-center gap-1 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/30"
              >
                <FaDownload className="text-sm" />
                Desktop App
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors font-medium flex items-center gap-1">
                  <FaCog className="text-sm" />
                  Админ
                </Link>
              )}
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* Server Status - Hidden on mobile */}
              <div className="hidden sm:flex items-center space-x-2 px-3 sm:px-4 py-2 bg-gray-100 dark:bg-dark rounded-lg border border-gray-300 dark:border-gray-800">
                <div className={`w-2 h-2 rounded-full ${serverStatus?.online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <FaUsers className="text-neon-cyan text-sm" />
                <span className="text-xs sm:text-sm font-medium">{serverStatus?.clients || 0}/{serverStatus?.maxClients || 32}</span>
              </div>
              
              {/* Auth Section - Desktop */}
              {user ? (
                <div className="hidden lg:flex items-center space-x-3">
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-dark border border-neon-cyan/30 hover:border-neon-cyan transition-colors"
                  >
                    <FaUser className="text-neon-cyan" />
                    <span className="font-semibold text-sm">{user.username}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors text-sm"
                  >
                    <FaSignOutAlt />
                    <span>Выход</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="hidden lg:flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 transition-all transform hover:scale-105 shadow-lg"
                >
                  <FaSteam className="text-xl" />
                  <span className="font-bold">Войти через Steam</span>
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg bg-gray-100 dark:bg-dark border border-gray-300 dark:border-gray-800 hover:border-neon-cyan transition-colors"
              >
                {mobileMenuOpen ? (
                  <FaTimes className="text-xl text-neon-cyan" />
                ) : (
                  <FaBars className="text-xl text-gray-300" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white dark:bg-dark-light border-b border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
              {/* Navigation Links */}
              <Link
                to="/"
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-gray-100 dark:bg-dark hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <FaMicrophone className="text-neon-cyan" />
                <span className="font-medium">Главная</span>
              </Link>
              <Link
                to="/dashboard"
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-gray-100 dark:bg-dark hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <FaFire className="text-neon-pink" />
                <span className="font-medium">Dashboard</span>
              </Link>
              <Link
                to="/music"
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-gray-100 dark:bg-dark hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <FaMusic className="text-purple-500" />
                <span className="font-medium">Музыка</span>
              </Link>
              <Link
                to="/memes"
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-gray-100 dark:bg-dark hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <FaImage className="text-neon-purple" />
                <span className="font-medium">Мемы</span>
              </Link>
              <Link
                to="/hall-of-fame"
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-gray-100 dark:bg-dark hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <FaTrophy className="text-yellow-500" />
                <span className="font-medium">Доска почёта</span>
              </Link>
              <Link
                to="/download"
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 hover:from-cyan-500/20 hover:to-purple-500/20 transition-colors"
              >
                <FaDownload className="text-cyan-400" />
                <span className="font-medium text-cyan-400">Скачать Desktop App</span>
              </Link>
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={closeMobileMenu}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 hover:bg-red-500/20 dark:hover:bg-red-500/30 transition-colors"
                >
                  <FaCog className="text-red-500" />
                  <span className="font-medium text-red-500">Панель админа</span>
                </Link>
              )}

              {/* Server Status - Mobile */}
              <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-100 dark:bg-dark border border-gray-300 dark:border-gray-800">
                <div className="flex items-center space-x-2">
                  <FaUsers className="text-neon-cyan" />
                  <span className="font-medium">TeamSpeak</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${serverStatus?.online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium">{serverStatus?.clients || 0}/{serverStatus?.maxClients || 32}</span>
                </div>
              </div>

              {/* Auth Section - Mobile */}
              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-gray-100 dark:bg-dark border border-neon-cyan/30 hover:border-neon-cyan transition-colors"
                  >
                    <FaUser className="text-neon-cyan" />
                    <span className="font-semibold">{user.username}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    <FaSignOutAlt />
                    <span className="font-semibold">Выход</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleLogin}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 transition-all shadow-lg"
                >
                  <FaSteam className="text-xl" />
                  <span className="font-bold">Войти через Steam</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
