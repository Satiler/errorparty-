import { Link } from 'react-router-dom'
import { FaExclamationTriangle } from 'react-icons/fa'
import { motion } from 'framer-motion'

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          className="inline-block mb-8"
        >
          <FaExclamationTriangle className="text-9xl text-yellow-500" />
        </motion.div>

        <h1 className="text-6xl md:text-8xl font-display font-black mb-4">
          <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            404
          </span>
        </h1>

        <h2 className="text-3xl font-display font-bold mb-4 text-gray-700 dark:text-gray-300">
          Упс! Страница потерялась
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Похоже, эта страница ушла в афк или её забанили. 
          Попробуй вернуться на главную!
        </p>

        <Link to="/" className="btn-primary inline-block">
          ← Вернуться на главную
        </Link>
      </motion.div>
    </div>
  )
}
