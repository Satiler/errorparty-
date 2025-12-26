const axios = require('axios');

/**
 * VK Captcha Solver - решение капчи VK через 2Captcha.com (RuCaptcha)
 * Использует метод VKCaptchaTask с redirectUri
 * API документация: https://2captcha.com/api-docs/vk-captcha
 */
class VKCaptchaSolver {
  constructor() {
    this.apiKey = process.env.RUCAPTCHA_API_KEY || '7ad7cd4cead2214a6afce31940a44bdd';
    this.apiUrl = 'https://api.2captcha.com'; // или api.rucaptcha.com - один сервис
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  /**
   * Инициализация (проверка баланса)
   */
  async initialize() {
    try {
      const response = await axios.post(`${this.apiUrl}/getBalance`, {
        clientKey: this.apiKey
      });

      if (response.data.errorId === 0) {
        console.log(`✅ 2Captcha/RuCaptcha готов. Баланс: $${response.data.balance}`);
        return true;
      } else {
        console.error('❌ 2Captcha ошибка:', response.data.errorDescription);
        return false;
      }
    } catch (error) {
      console.error('❌ Ошибка подключения к 2Captcha:', error.message);
      return false;
    }
  }

  /**
   * Создать задачу на решение VK капчи через VKCaptchaTask
   */
  async createTask(redirectUri) {
    try {
      // Список рабочих прокси (протестированы для VK API)
      const workingProxies = [
        { ip: '104.20.0.76', port: 80 },
        { ip: '104.18.160.41', port: 80 },
        { ip: '104.25.0.40', port: 80 },
        { ip: '66.235.200.103', port: 80 },
        { ip: '104.24.29.20', port: 80 }
      ];
      
      // Выбираем случайный рабочий прокси
      const proxy = workingProxies[Math.floor(Math.random() * workingProxies.length)];
      
      const response = await axios.post(`${this.apiUrl}/createTask`, {
        clientKey: this.apiKey,
        task: {
          type: 'VKCaptchaTask',
          redirectUri: redirectUri,
          userAgent: this.userAgent,
          proxyType: 'http',
          proxyAddress: proxy.ip,
          proxyPort: proxy.port
        }
      });

      if (response.data.errorId === 0) {
        return response.data.taskId;
      } else {
        throw new Error(response.data.errorDescription || 'Ошибка создания задачи');
      }
    } catch (error) {
      throw new Error(`Не удалось создать задачу: ${error.message}`);
    }
  }

  /**
   * Конвертировать изображение в base64
   */
  async imageToBase64(imageUrl) {
    try {
      // Добавляем User-Agent и куки для VK
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Referer': 'https://vk.com/'
        }
      });
      
      // Проверяем, что получили изображение, а не HTML
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error(`Получен не изображение, а ${contentType}. URL может требовать авторизации.`);
      }
      
      return Buffer.from(response.data).toString('base64');
    } catch (error) {
      throw new Error(`Ошибка загрузки изображения: ${error.message}`);
    }
  }

  /**
   * Получить результат задачи
   */
  async getTaskResult(taskId, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Ждем 3 секунды

      try {
        const response = await axios.post(`${this.apiUrl}/getTaskResult`, {
          clientKey: this.apiKey,
          taskId: taskId
        });

        if (response.data.errorId === 0) {
          if (response.data.status === 'ready') {
            // Для VKCaptchaTask решение в response.data.solution.token
            return response.data.solution.token;
          } else if (response.data.status === 'processing') {
            console.log(`  ⏳ Обработка... (${i + 1}/${maxAttempts})`);
            continue;
          }
        } else {
          throw new Error(response.data.errorDescription || 'Ошибка получения результата');
        }
      } catch (error) {
        if (i < maxAttempts - 1) {
          console.log(`  ⚠️  Попытка ${i + 1}: ${error.message}`);
        }
      }
    }

    throw new Error('Превышено время ожидания решения капчи');
  }

  /**
   * Распознать VK капчу и получить токен
   */
  async solveCaptcha(redirectUri) {
    try {
      console.log('🔐 Отправка VK капчи в 2Captcha...');
      console.log(`   redirectUri: ${redirectUri.substring(0, 100)}...`);
      
      // Создаем задачу
      const taskId = await this.createTask(redirectUri);
      console.log(`  ✅ Задача создана: ${taskId}`);

      // Получаем результат (токен)
      const token = await this.getTaskResult(taskId);
      console.log(`  ✅ Капча решена! Токен получен`);

      return token;
    } catch (error) {
      console.error('❌ Ошибка решения капчи:', error.message);
      return null;
    }
  }

  /**
   * Решить капчу VK API
   * @param {string} captchaSid - ID капчи от VK
   * @param {string} redirectUri - URL для VKCaptchaTask (из error.redirect_uri)
   */
  async solveVKCaptcha(captchaSid, redirectUri) {
    try {
      // Используем VKCaptchaTask для получения токена
      if (redirectUri) {
        const token = await this.solveCaptcha(redirectUri);
        
        if (token) {
          return {
            captcha_sid: captchaSid,
            captcha_key: token
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Ошибка решения VK капчи:', error.message);
      return null;
    }
  }
}

// Singleton instance
const captchaSolver = new VKCaptchaSolver();

module.exports = captchaSolver;
