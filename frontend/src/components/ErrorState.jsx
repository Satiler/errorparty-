import { motion } from 'framer-motion';

/**
 * Компонент для отображения ошибок
 * @param {Object} props
 * @param {string} props.message - Сообщение об ошибке
 * @param {Function} props.retry - Callback для повтора (опционально)
 * @param {string} props.title - Заголовок (по умолчанию "Ошибка загрузки")
 */
export default function ErrorState({ message, retry, title = 'Ошибка загрузки' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-red-500/10 border border-red-500 rounded-lg p-8 text-center max-w-2xl mx-auto"
    >
      <div className="text-red-500 text-5xl mb-4">⚠️</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-red-400 mb-6">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition-colors active:scale-95"
        >
          Попробовать снова
        </button>
      )}
    </motion.div>
  );
}
