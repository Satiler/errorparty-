/**
 * Secure Logger Utility
 * Маскирует чувствительные данные в логах
 */

/**
 * Маскирует чувствительные данные в строке
 * @param {string} message - Сообщение для логирования
 * @returns {string} Замаскированное сообщение
 */
const maskSensitiveData = (message) => {
  if (typeof message !== 'string') {
    return message;
  }

  return message
    // Токены: token: xxxxx -> token: xx****
    .replace(/token:\s*([A-Za-z0-9\-]{4})[A-Za-z0-9\-]+/gi, 'token: $1****')
    // Пароли: password: xxxxx -> password: ****
    .replace(/password:\s*[^\s,\)]+/gi, 'password: ****')
    // Секреты: secret: xxxxx -> secret: ****
    .replace(/secret:\s*[^\s,\)]+/gi, 'secret: ****')
    // JWT токены: Bearer xxxxx -> Bearer xx****
    .replace(/Bearer\s+([A-Za-z0-9\-_]{4})[A-Za-z0-9\-_\.]+/gi, 'Bearer $1****')
    // Email: user@domain.com -> u***@d***.com
    .replace(/([a-zA-Z0-9])[a-zA-Z0-9._%+-]*@([a-zA-Z0-9])[a-zA-Z0-9.-]*\.[a-zA-Z]{2,}/g, '$1***@$2***.***')
    // Steam Guard коды: XXXXX -> XX***
    .replace(/\b([A-Z0-9]{2})[A-Z0-9]{3}\b/g, '$1***');
};

/**
 * Безопасный логгер
 */
const logger = {
  /**
   * Логирование информации
   * @param {...any} args - Аргументы для логирования
   */
  log: (...args) => {
    const maskedArgs = args.map(arg => 
      typeof arg === 'string' ? maskSensitiveData(arg) : arg
    );
    console.log(...maskedArgs);
  },

  /**
   * Логирование ошибок
   * @param {...any} args - Аргументы для логирования
   */
  error: (...args) => {
    const maskedArgs = args.map(arg => 
      typeof arg === 'string' ? maskSensitiveData(arg) : arg
    );
    console.error(...maskedArgs);
  },

  /**
   * Логирование предупреждений
   * @param {...any} args - Аргументы для логирования
   */
  warn: (...args) => {
    const maskedArgs = args.map(arg => 
      typeof arg === 'string' ? maskSensitiveData(arg) : arg
    );
    console.warn(...maskedArgs);
  },

  /**
   * Логирование отладочной информации
   * @param {...any} args - Аргументы для логирования
   */
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      const maskedArgs = args.map(arg => 
        typeof arg === 'string' ? maskSensitiveData(arg) : arg
      );
      console.debug(...maskedArgs);
    }
  },

  /**
   * Логирование информации (без маскировки - только для internal use)
   * ⚠️ Использовать с осторожностью!
   * @param {...any} args - Аргументы для логирования
   */
  raw: (...args) => {
    console.log('[RAW]', ...args);
  }
};

module.exports = logger;
