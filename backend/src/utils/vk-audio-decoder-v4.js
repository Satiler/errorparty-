const crypto = require('crypto');

/**
 * KissVK Audio URL Decoder v4 - CryptoJS Format with Salt
 * 
 * Based on reverse-engineered kissvk.top JavaScript:
 * CryptoJSAesJson.decrypt('{"ct": "encrypted", "s": "salt", "iv": "iv"}', location.hostname)
 * 
 * Format: encrypted:salt:iv (3 parts, colon-separated)
 * - Part 1: Base64 encrypted ciphertext
 * - Part 2: Hex salt (for key derivation)
 * - Part 3: Hex IV
 * 
 * Uses EVP_BytesToKey with salt + password to derive AES-256-CBC key
 */

/**
 * EVP_BytesToKey implementation (OpenSSL compatible)
 * Derives key and IV from password and salt using MD5 hashing
 * 
 * @param {Buffer} password - Password buffer
 * @param {Buffer} salt - Salt buffer (8 bytes)
 * @param {number} keyLen - Desired key length in bytes
 * @param {number} ivLen - Desired IV length in bytes
 * @returns {{key: Buffer, iv: Buffer}}
 */
function EVP_BytesToKey(password, salt, keyLen, ivLen) {
    const hashes = [];
    let data = Buffer.concat([password, salt]);
    let hash = crypto.createHash('md5').update(data).digest();
    hashes.push(hash);
    
    let keyIv = hash;
    while (keyIv.length < keyLen + ivLen) {
        data = Buffer.concat([hash, password, salt]);
        hash = crypto.createHash('md5').update(data).digest();
        hashes.push(hash);
        keyIv = Buffer.concat([keyIv, hash]);
    }
    
    return {
        key: keyIv.slice(0, keyLen),
        iv: keyIv.slice(keyLen, keyLen + ivLen)
    };
}

/**
 * Decrypt VK Audio URL using password-based AES-256-CBC
 * 
 * @param {string} encodedAudio - Format: "encrypted:salt:iv"
 * @param {string} password - Decryption password (kissvk.top hostname)
 * @returns {string|null} - Decrypted URL or null on failure
 */
function decryptVKAudio(encodedAudio, password = 'kissvk.top') {
    try {
        // Split encoded string
        const parts = encodedAudio.split(':');
        if (parts.length !== 3) {
            console.error('Invalid format: expected 3 parts (encrypted:salt:iv)');
            return null;
        }

        const [encryptedBase64, saltHex, ivHex] = parts;

        // Decode components
        const encrypted = Buffer.from(encryptedBase64, 'base64');
        const salt = Buffer.from(saltHex, 'hex');
        const ivProvided = Buffer.from(ivHex, 'hex');

        // Derive key and IV from password + salt (CryptoJS compatible)
        const passwordBuffer = Buffer.from(password, 'utf8');
        const { key, iv } = EVP_BytesToKey(passwordBuffer, salt, 32, 16); // AES-256-CBC

        console.log(`[DECRYPT v4] Password: "${password}"`);
        console.log(`[DECRYPT v4] Salt: ${salt.toString('hex')} (${salt.length} bytes)`);
        console.log(`[DECRYPT v4] IV (provided): ${ivProvided.toString('hex')} (${ivProvided.length} bytes)`);
        console.log(`[DECRYPT v4] IV (derived): ${iv.toString('hex')} (${iv.length} bytes)`);
        console.log(`[DECRYPT v4] Key (derived): ${key.toString('hex')} (${key.length} bytes)`);

        // Try decryption with DERIVED IV (from EVP_BytesToKey)
        try {
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            decipher.setAutoPadding(true);
            
            let decrypted = decipher.update(encrypted);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            const url = decrypted.toString('utf8');
            
            if (url.startsWith('http://') || url.startsWith('https://')) {
                console.log(`[DECRYPT v4] ✓ Success with derived IV: ${url.substring(0, 50)}...`);
                return url;
            }
        } catch (err) {
            console.log(`[DECRYPT v4] ✗ Failed with derived IV: ${err.message}`);
        }

        // Try decryption with PROVIDED IV (from encoded string)
        try {
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivProvided);
            decipher.setAutoPadding(true);
            
            let decrypted = decipher.update(encrypted);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            const url = decrypted.toString('utf8');
            
            if (url.startsWith('http://') || url.startsWith('https://')) {
                console.log(`[DECRYPT v4] ✓ Success with provided IV: ${url.substring(0, 50)}...`);
                return url;
            }
        } catch (err) {
            console.log(`[DECRYPT v4] ✗ Failed with provided IV: ${err.message}`);
        }

        console.error('[DECRYPT v4] Both IV attempts failed');
        return null;

    } catch (error) {
        console.error(`[DECRYPT v4] Exception: ${error.message}`);
        return null;
    }
}

module.exports = { decryptVKAudio };
