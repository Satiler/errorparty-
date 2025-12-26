import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import { useEffect } from 'react';

// Toast Component для одиночного тоста
export function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <FaCheckCircle className="text-2xl text-green-500" />,
    error: <FaExclamationCircle className="text-2xl text-red-500" />,
    info: <FaInfoCircle className="text-2xl text-blue-500" />
  };

  const backgrounds = {
    success: 'bg-green-500/20 border-green-500',
    error: 'bg-red-500/20 border-red-500',
    info: 'bg-blue-500/20 border-blue-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className={`fixed top-20 right-4 z-50 max-w-md flex items-center space-x-3 px-6 py-4 rounded-lg border-2 ${backgrounds[type]} backdrop-blur-sm shadow-2xl`}
    >
      {icons[type]}
      <p className="text-white font-medium flex-1">{message}</p>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-white transition-colors"
      >
        <FaTimes />
      </button>
    </motion.div>
  );
}

// Toast Container для управления несколькими тостами (default export)
export default function ToastContainer({ toasts = [], removeToast }) {
  return (
    <AnimatePresence>
      {toasts.map((toast, index) => (
        <div key={toast.id} style={{ top: `${80 + index * 80}px` }} className="fixed right-4 z-50">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
            duration={toast.duration}
          />
        </div>
      ))}
    </AnimatePresence>
  );
}
