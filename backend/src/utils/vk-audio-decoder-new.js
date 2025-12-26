/**
 * KissVK Audio URL Decoder
 * Декодирует зашифрованные ссылки из data-audio атрибутов kissvk.top
 * Использует AES-256-CBC шифрование (как CryptoJS на фронтенде)
 */

const crypto = require('crypto');

class VKAudioDecoder {
  /**
   * Декодирует зашифрованную строку KissVK Audio
   * Формат: encrypted_base64:hex_key:hex_iv
   * @param {string} encodedString - Зашифрованная строка из data-audio
   * @returns {string|null} - Расшифрованный URL или null
   */
  static decode(encodedString) {
    if (!encodedString || typeof encodedString !== 'string') {
      return null;
    }

    try {
      // Формат KissVK: encrypted_url:hex_key:hex_iv
      const parts = encodedString.split(':');
      
      if (parts.length !== 3) {
        console.log(`[VK Decoder] Invalid format - expected 3 parts, got ${parts.length}`);
        return null;
      }

      const [encryptedData, hexKey, hexIv] = parts;
      
      // Конвертируем зашифрованные данные из base64 в buffer
      const encryptedBuffer = Buffer.from(encryptedData, 'base64');
      
      // Конвертируем hex ключ и IV в buffers
      const keyBuffer = Buffer.from(hexKey, 'hex');
      let ivBuffer = Buffer.from(hexIv, 'hex');
      
      // Определяем тип шифрования по длине ключа
      let algorithm;
      if (keyBuffer.length === 16) {
        algorithm = 'aes-128-cbc'; // AES-128-CBC для 16-байтного ключа
      } else if (keyBuffer.length === 32) {
        algorithm = 'aes-256-cbc'; // AES-256-CBC для 32-байтного ключа
      } else {
        console.log(`[VK Decoder] Invalid key length: ${keyBuffer.length}, expected 16 or 32`);
        return null;
      }
      
      // Расширяем IV до 16 байт если нужно (дополняем нулями)
      if (ivBuffer.length < 16) {
        const padding = Buffer.alloc(16 - ivBuffer.length);
        ivBuffer = Buffer.concat([ivBuffer, padding]);
        console.log(`[VK Decoder] IV padded from ${Buffer.from(hexIv, 'hex').length} to 16 bytes`);
      } else if (ivBuffer.length > 16) {
        console.log(`[VK Decoder] Invalid IV length: ${ivBuffer.length}, expected ≤16`);
        return null;
      }
      
      // AES-CBC расшифровка
      const decipher = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
      decipher.setAutoPadding(true);
      
      let decrypted = decipher.update(encryptedBuffer);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      const url = decrypted.toString('utf8');
      
      // Валидация URL
      if (url.startsWith('http://') || url.startsWith('https://')) {
        console.log(`[VK Decoder] Successfully decrypted: ${url.substring(0, 50)}...`);
        return url;
      }
      
      console.log(`[VK Decoder] Decrypted but invalid URL: ${url.substring(0, 50)}`);
      return null;
      
    } catch (error) {
      console.error('[VK Decoder] Decryption error:', error.message);
      return null;
    }
  }

  /**
   * Пакетная расшифровка нескольких URL
   */
  static decodeMany(encodedStrings) {
    return encodedStrings.map(encoded => this.decode(encoded));
  }

  /**
   * Декодирует и возвращает объект с результатом и статусом
   */
  static decodeWithStatus(encodedString) {
    const url = this.decode(encodedString);
    return {
      success: url !== null,
      url: url,
      error: url === null ? 'Decryption failed' : null
    };
  }
}

module.exports = VKAudioDecoder;
