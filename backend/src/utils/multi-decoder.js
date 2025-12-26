/**
 * Multi-Decoder - Универсальный декодер для различных источников
 * Поддерживает KissVK, Hitmo, Musify и другие популярные сервисы
 */

const crypto = require('crypto');

class MultiDecoder {
  constructor() {
    this.decoders = {
      kissvk: this.decodeKissVK.bind(this),
      vk: this.decodeVKDirect.bind(this),
      hitmo: this.decodeHitmo.bind(this),
      musify: this.decodeMusify.bind(this),
      promodj: this.decodePromodj.bind(this)
    };
  }

  /**
   * Автоматическое определение типа кодирования и декодирование
   */
  async decode(encodedData, source = 'auto') {
    if (!encodedData) {
      return { success: false, error: 'No encoded data provided' };
    }

    // Если уже URL - просто возвращаем
    if (encodedData.startsWith('http://') || encodedData.startsWith('https://')) {
      return { success: true, url: encodedData, method: 'direct' };
    }

    // Если источник известен
    if (source !== 'auto' && this.decoders[source]) {
      const result = await this.decoders[source](encodedData);
      if (result.success) return result;
    }

    // Перебираем все декодеры
    for (const [decoderName, decoder] of Object.entries(this.decoders)) {
      try {
        const result = await decoder(encodedData);
        if (result.success) {
          console.log(`[MultiDecoder] ✓ Decoded with ${decoderName}`);
          return result;
        }
      } catch (error) {
        // Продолжаем пробовать другие декодеры
      }
    }

    return { success: false, error: 'All decoding methods failed' };
  }

  /**
   * KissVK Decoder - множественные алгоритмы
   */
  async decodeKissVK(encodedString) {
    const parts = encodedString.split(':');
    if (parts.length !== 3) {
      return { success: false, error: 'Invalid KissVK format' };
    }

    const [encryptedData, hexKey, hexIV] = parts;

    // Метод 1: CryptoJS-compatible с паролем 'kissvk.top'
    try {
      const password = 'kissvk.top';
      const encrypted = Buffer.from(encryptedData, 'base64');
      const salt = Buffer.from(hexIV, 'hex');
      
      const derived = this.evpBytesToKey(Buffer.from(password, 'utf8'), salt, 32, 16);
      const actualIV = Buffer.from(hexKey, 'hex');
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', derived.key, actualIV);
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      let url = decrypted.toString('utf8');
      url = this.cleanUrl(url);
      
      if (this.isValidUrl(url)) {
        return { success: true, url, method: 'kissvk-cryptojs' };
      }
    } catch (error) {
      // Пробуем следующий метод
    }

    // Метод 2: Прямое AES-128-CBC
    try {
      const encrypted = Buffer.from(encryptedData, 'base64');
      const key = Buffer.from(hexKey, 'hex');
      const iv = Buffer.alloc(16);
      Buffer.from(hexIV, 'hex').copy(iv, 0);
      
      if (key.length === 16) {
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        let url = this.cleanUrl(decrypted.toString('utf8'));
        if (this.isValidUrl(url)) {
          return { success: true, url, method: 'kissvk-aes128' };
        }
      }
    } catch (error) {
      // Пробуем следующий метод
    }

    // Метод 3: AES-192-CBC (part2+part3 как ключ)
    try {
      const encrypted = Buffer.from(encryptedData, 'base64');
      const part2 = Buffer.from(hexKey, 'hex');
      const part3 = Buffer.from(hexIV, 'hex');
      
      if (part2.length === 16 && part3.length === 8) {
        const key192 = Buffer.concat([part2, part3]);
        const iv = Buffer.alloc(16, 0);
        
        const decipher = crypto.createDecipheriv('aes-192-cbc', key192, iv);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        let url = this.cleanUrl(decrypted.toString('utf8'));
        if (this.isValidUrl(url)) {
          return { success: true, url, method: 'kissvk-aes192' };
        }
      }
    } catch (error) {
      // Не удалось
    }

    return { success: false, error: 'KissVK decryption failed' };
  }

  /**
   * VK Direct Decoder - для прямых ссылок VK
   */
  async decodeVKDirect(encodedString) {
    try {
      // VK использует параметры extra, hash для защиты URL
      // Формат может быть: base_url?extra=xxx&hash=yyy
      
      if (encodedString.includes('?')) {
        // Уже декодированный URL
        return { success: true, url: encodedString, method: 'vk-direct' };
      }

      // Попытка декодирования base64
      const decoded = Buffer.from(encodedString, 'base64').toString('utf8');
      if (this.isValidUrl(decoded)) {
        return { success: true, url: decoded, method: 'vk-base64' };
      }

      return { success: false, error: 'VK decoding failed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Hitmo Decoder - обычно не требует декодирования
   */
  async decodeHitmo(encodedString) {
    // Hitmo обычно предоставляет прямые ссылки
    if (this.isValidUrl(encodedString)) {
      return { success: true, url: encodedString, method: 'hitmo-direct' };
    }
    return { success: false, error: 'Hitmo URL invalid' };
  }

  /**
   * Musify Decoder
   */
  async decodeMusify(encodedString) {
    // Musify может использовать API endpoints
    if (this.isValidUrl(encodedString)) {
      return { success: true, url: encodedString, method: 'musify-direct' };
    }
    return { success: false, error: 'Musify URL invalid' };
  }

  /**
   * PromoДJ Decoder
   */
  async decodePromodj(encodedString) {
    if (this.isValidUrl(encodedString)) {
      return { success: true, url: encodedString, method: 'promodj-direct' };
    }
    return { success: false, error: 'PromoДJ URL invalid' };
  }

  /**
   * EVP_BytesToKey - OpenSSL/CryptoJS compatible
   */
  evpBytesToKey(password, salt, keyLen, ivLen) {
    const derived = [];
    let block = Buffer.alloc(0);
    
    while (derived.length < keyLen + ivLen) {
      const hash = crypto.createHash('md5');
      hash.update(block);
      hash.update(password);
      hash.update(salt);
      block = hash.digest();
      derived.push(...block);
    }
    
    return {
      key: Buffer.from(derived.slice(0, keyLen)),
      iv: Buffer.from(derived.slice(keyLen, keyLen + ivLen))
    };
  }

  /**
   * Очистка URL от escape-последовательностей
   */
  cleanUrl(url) {
    if (typeof url !== 'string') return '';
    
    // Удаляем кавычки
    if (url.startsWith('"') && url.endsWith('"')) {
      try {
        url = JSON.parse(url);
      } catch (e) {
        url = url.slice(1, -1);
      }
    }
    
    // Заменяем escaped слэши
    url = url.replace(/\\\//g, '/');
    
    // Удаляем управляющие символы
    url = url.replace(/[\x00-\x1F\x7F]/g, '');
    
    return url.trim();
  }

  /**
   * Проверка валидности URL
   */
  isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('http://') || url.startsWith('https://');
  }

  /**
   * Batch декодирование
   */
  async decodeMany(encodedDataArray, source = 'auto') {
    return Promise.all(
      encodedDataArray.map(data => this.decode(data, source))
    );
  }
}

// Singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new MultiDecoder();
    }
    return instance;
  },
  MultiDecoder
};
