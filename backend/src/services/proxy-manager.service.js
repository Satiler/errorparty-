const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

/**
 * Proxy Manager Service - управление ротацией прокси
 * 
 * Поддерживает:
 * - HTTP/HTTPS прокси
 * - SOCKS4/SOCKS5 прокси
 * - Автоматическая ротация
 * - Проверка работоспособности
 * - Балансировка нагрузки
 */
class ProxyManagerService {
  constructor() {
    // Список прокси (можно загрузить из env, файла или API)
    this.proxies = this.loadProxies();
    this.currentIndex = 0;
    this.failedProxies = new Set();
    this.proxyStats = new Map(); // Статистика использования
    this.lastRotation = Date.now();
    this.rotationInterval = 60000; // Ротация каждую минуту
  }

  /**
   * Загрузить список прокси из конфигурации
   */
  loadProxies() {
    const proxiesEnv = process.env.PROXY_LIST || '';
    
    // Формат: http://user:pass@host:port,socks5://host:port,...
    if (proxiesEnv) {
      return proxiesEnv.split(',').map(p => p.trim()).filter(p => p.length > 0);
    }

    // Дефолтные бесплатные прокси (для теста)
    // В продакшене лучше использовать платные сервисы
    return [
      // HTTP прокси
      'http://8.219.97.248:80',
      'http://47.88.62.42:80',
      'http://47.243.177.210:8080',
      
      // SOCKS5 прокси  
      'socks5://8.219.97.248:1080',
      'socks5://47.88.62.42:1080',
      
      // Можно добавить платные прокси:
      // 'http://username:password@premium-proxy.com:8080',
      // 'socks5://username:password@premium-proxy.com:1080'
    ];
  }

  /**
   * Получить следующий прокси (ротация)
   */
  getNextProxy() {
    if (this.proxies.length === 0) {
      return null; // Работаем без прокси
    }

    // Автоматическая ротация по времени
    const now = Date.now();
    if (now - this.lastRotation > this.rotationInterval) {
      this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
      this.lastRotation = now;
    }

    // Пропускаем неработающие прокси
    let attempts = 0;
    while (attempts < this.proxies.length) {
      const proxy = this.proxies[this.currentIndex];
      
      if (!this.failedProxies.has(proxy)) {
        return proxy;
      }

      this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
      attempts++;
    }

    // Если все прокси неработающие - сбрасываем список и пробуем снова
    if (attempts >= this.proxies.length) {
      console.log('⚠️  Все прокси неработающие, сброс списка...');
      this.failedProxies.clear();
      return this.proxies[this.currentIndex];
    }

    return null;
  }

  /**
   * Получить прокси-агент для axios
   */
  getProxyAgent(proxyUrl) {
    if (!proxyUrl) return null;

    try {
      if (proxyUrl.startsWith('socks4://') || proxyUrl.startsWith('socks5://')) {
        return new SocksProxyAgent(proxyUrl);
      } else if (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://')) {
        return new HttpsProxyAgent(proxyUrl);
      }
    } catch (error) {
      console.error(`❌ Ошибка создания прокси-агента для ${proxyUrl}:`, error.message);
      return null;
    }

    return null;
  }

  /**
   * Отметить прокси как неработающий
   */
  markProxyAsFailed(proxyUrl) {
    this.failedProxies.add(proxyUrl);
    console.log(`❌ Прокси помечен как неработающий: ${proxyUrl}`);
  }

  /**
   * Отметить успешное использование прокси
   */
  markProxyAsSuccess(proxyUrl) {
    if (!this.proxyStats.has(proxyUrl)) {
      this.proxyStats.set(proxyUrl, { success: 0, failed: 0 });
    }
    this.proxyStats.get(proxyUrl).success++;
  }

  /**
   * Проверить работоспособность прокси
   */
  async testProxy(proxyUrl, testUrl = 'https://api.ipify.org?format=json') {
    try {
      const agent = this.getProxyAgent(proxyUrl);
      
      const response = await axios.get(testUrl, {
        httpsAgent: agent,
        httpAgent: agent,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.status === 200) {
        console.log(`✅ Прокси работает: ${proxyUrl} (IP: ${response.data.ip})`);
        return true;
      }
    } catch (error) {
      console.log(`❌ Прокси не работает: ${proxyUrl} - ${error.message}`);
    }

    return false;
  }

  /**
   * Проверить все прокси
   */
  async testAllProxies() {
    console.log('\n🔍 === ПРОВЕРКА ПРОКСИ ===\n');
    
    const results = [];
    
    for (const proxy of this.proxies) {
      const isWorking = await this.testProxy(proxy);
      results.push({ proxy, isWorking });
      
      if (!isWorking) {
        this.markProxyAsFailed(proxy);
      }
      
      // Задержка между проверками
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const workingCount = results.filter(r => r.isWorking).length;
    console.log(`\n📊 Результат: ${workingCount}/${this.proxies.length} прокси работают`);
    
    return results;
  }

  /**
   * Получить статистику по прокси
   */
  getStats() {
    const stats = [];
    
    for (const proxy of this.proxies) {
      const proxyStats = this.proxyStats.get(proxy) || { success: 0, failed: 0 };
      const isFailed = this.failedProxies.has(proxy);
      
      stats.push({
        proxy,
        success: proxyStats.success,
        failed: proxyStats.failed,
        status: isFailed ? 'failed' : 'active'
      });
    }

    return stats;
  }

  /**
   * Создать axios instance с прокси
   */
  createAxiosInstance(options = {}) {
    const proxy = this.getNextProxy();
    const agent = proxy ? this.getProxyAgent(proxy) : null;

    const config = {
      timeout: 15000,
      ...options
    };

    if (agent) {
      config.httpsAgent = agent;
      config.httpAgent = agent;
      console.log(`🔄 Используем прокси: ${proxy.replace(/:[^:@]+@/, ':****@')}`);
    }

    return { axios: axios.create(config), proxy };
  }

  /**
   * Выполнить запрос с автоматической ротацией прокси
   */
  async makeRequest(url, options = {}, retries = 3) {
    let lastError = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { axios: axiosInstance, proxy } = this.createAxiosInstance(options);
        
        const response = await axiosInstance.get(url, options);
        
        if (proxy) {
          this.markProxyAsSuccess(proxy);
        }
        
        return response;
      } catch (error) {
        lastError = error;
        const proxy = this.proxies[this.currentIndex];
        
        console.log(`⚠️  Попытка ${attempt}/${retries} не удалась: ${error.message}`);
        
        if (proxy && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT')) {
          this.markProxyAsFailed(proxy);
        }

        // Переключаем на следующий прокси
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    throw lastError;
  }
}

// Singleton instance
const proxyManager = new ProxyManagerService();

module.exports = proxyManager;
