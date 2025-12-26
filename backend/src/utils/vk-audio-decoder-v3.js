/**
 * KissVK Audio URL Decoder v3
 * Использует hostname как пароль (kissvk.top)
 */

const crypto = require('crypto');

class VKAudioDecoder {
  /**
   * Декодирует с использованием hostname как пароля
   * Формат: encrypted_base64:hex_key:hex_iv
   * Password: kissvk.top
   */
  static decode(encodedString) {
    if (!encodedString || typeof encodedString !== 'string') {
      console.log(`[VK Decoder] ✗ Invalid input: ${typeof encodedString}`);
      return null;
    }

    try {
      const parts = encodedString.split(':');
      
      if (parts.length !== 3) {
        console.log(`[VK Decoder] ✗ Invalid format: expected 3 parts, got ${parts.length}`);
        console.log(`[VK Decoder]    Input (first 100 chars): ${encodedString.substring(0, 100)}`);
        return null;
      }

      const [encryptedData, hexKey, hexIV] = parts;
      
      console.log(`[VK Decoder] 🔓 Decrypting with format:`);
      console.log(`[VK Decoder]    Encrypted: ${encryptedData.substring(0, 30)}...`);
      console.log(`[VK Decoder]    Key (hex): ${hexKey}`);
      console.log(`[VK Decoder]    IV (hex): ${hexIV}`);
      
      // kissvk uses domain as password with CryptoJS format
      const password = 'kissvk.top';
      
      // CryptoJS-compatible decryption
      const encrypted = Buffer.from(encryptedData, 'base64');
      const salt = Buffer.from(hexIV, 'hex'); // Third part is salt (IV source)
      
      // EVP_BytesToKey to generate key from password (like CryptoJS does)
      const derived = this.evpBytesToKey(Buffer.from(password, 'utf8'), salt, 32, 16);
      
      // Note: hexKey (second part) is actually the derived IV in CryptoJS format
      // We use it directly as IV instead of the derived one
      const actualIV = Buffer.from(hexKey, 'hex');
      
      console.log(`[VK Decoder]    Password: ${password}`);
      console.log(`[VK Decoder]    Derived key: ${derived.key.toString('hex').substring(0, 20)}...`);
      console.log(`[VK Decoder]    Using IV: ${actualIV.toString('hex')}`);
      
      // AES-256-CBC decryption
      const decipher = crypto.createDecipheriv('aes-256-cbc', derived.key, actualIV);
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      let url = decrypted.toString('utf8');
      
      console.log(`[VK Decoder]    Decrypted (first 100 chars): ${url.substring(0, 100)}`);
      
      // Handle JSON-escaped format (e.g., "https:\/\/...")
      if (url.startsWith('"') && url.endsWith('"')) {
        try {
          // JSON.parse can handle escaped slashes
          url = JSON.parse(url);
        } catch (e) {
          // If JSON parse fails, manually unescape
          url = url.slice(1, -1).replace(/\\\//g, '/');
        }
      } else {
        // Replace escaped slashes if not in JSON format
        url = url.replace(/\\\//g, '/');
      }
      
      if (url.startsWith('http://') || url.startsWith('https://')) {
        console.log(`[VK Decoder] ✓ SUCCESS: ${url.substring(0, 80)}...`);
        return url;
      }
      
      console.log(`[VK Decoder] ✗ Invalid URL format: ${url.substring(0, 50)}`);
      return null;
      
    } catch (error) {
      console.error(`[VK Decoder] ✗ Error: ${error.message}`);
      console.error(`[VK Decoder]    Stack: ${error.stack}`);
      return null;
    }
  }

  /**
   * EVP_BytesToKey - OpenSSL/CryptoJS compatible
   */
  static evpBytesToKey(password, salt, keyLen, ivLen) {
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

  static decodeMany(encodedStrings) {
    return encodedStrings.map(encoded => this.decode(encoded));
  }

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
