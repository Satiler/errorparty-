import { motion } from 'framer-motion';
import { FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative w-14 h-7 bg-gray-700 dark:bg-gray-600 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-neon-cyan"
      whileTap={{ scale: 0.95 }}
      aria-label="Toggle theme"
    >
      <motion.div
        className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg"
        animate={{
          x: isDark ? 0 : 28
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
      >
        {isDark ? (
          <FaMoon className="text-gray-800 text-xs" />
        ) : (
          <FaSun className="text-yellow-500 text-xs" />
        )}
      </motion.div>
      
      {/* Background icons */}
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        <FaMoon className={`text-xs transition-opacity ${isDark ? 'text-gray-400 opacity-100' : 'text-gray-500 opacity-30'}`} />
        <FaSun className={`text-xs transition-opacity ${!isDark ? 'text-yellow-400 opacity-100' : 'text-gray-500 opacity-30'}`} />
      </div>
    </motion.button>
  );
};

export default ThemeToggle;
