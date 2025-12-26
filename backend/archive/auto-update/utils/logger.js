/**
 * Простой logger для системы автообновления
 */

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = logLevels[process.env.LOG_LEVEL || 'info'];

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
}

const logger = {
  error: (message, meta) => {
    if (currentLevel >= logLevels.error) {
      console.error(formatMessage('error', message, meta));
    }
  },
  
  warn: (message, meta) => {
    if (currentLevel >= logLevels.warn) {
      console.warn(formatMessage('warn', message, meta));
    }
  },
  
  info: (message, meta) => {
    if (currentLevel >= logLevels.info) {
      console.log(formatMessage('info', message, meta));
    }
  },
  
  debug: (message, meta) => {
    if (currentLevel >= logLevels.debug) {
      console.log(formatMessage('debug', message, meta));
    }
  }
};

module.exports = logger;
