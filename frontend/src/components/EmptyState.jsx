import { motion } from 'framer-motion';

/**
 * Компонент для отображения пустых состояний
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Иконка (компонент)
 * @param {string} props.title - Заголовок
 * @param {string} props.description - Описание (опционально)
 * @param {React.ReactNode} props.action - Кнопка действия (опционально)
 */
export default function EmptyState({ icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-20 px-4 text-center"
    >
      {icon && (
        <div className="text-6xl mb-6 text-gray-600">
          {icon}
        </div>
      )}
      <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-gray-400 mb-6 max-w-md">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </motion.div>
  );
}
