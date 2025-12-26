const crypto = require('crypto');

/**
 * KissVK Audio URL Decoder v5 - Direct Key/IV (Padded)
 * 
 * After analyzing kissvk.top, the format might be:
 * encrypted:key:iv_partial
 * 
 * Where:
 * - Part 1: Base64 encrypted ciphertext
 * - Part 2: Hex key (16 bytes for AES-128, or 32 bytes for AES-256)
 * - Part 3: Hex IV partial (8 bytes, needs padding to 16)
 * 
 * Try multiple combinations:
 * 1. AES-128-CBC with key, IV padded with zeros
 * 2. AES-256-CBC with key, IV padded with zeros
 * 3. AES-128-CBC with key, IV repeated to 16 bytes
 * 4. Use part2 as key directly (try both 128 and 256)
 */

/**
 * Decrypt VK Audio URL - tries multiple AES configurations
 * 
 * @param {string} encodedAudio - Format: "encrypted:hex_part2:hex_part3"
 * @returns {string|null} - Decrypted URL or null on failure
 */
function decryptVKAudio(encodedAudio) {
    try {
        // Split encoded string
        const parts = encodedAudio.split(':');
        if (parts.length !== 3) {
            console.error('Invalid format: expected 3 parts');
            return null;
        }

        const [encryptedBase64, part2Hex, part3Hex] = parts;

        // Decode components
        const encrypted = Buffer.from(encryptedBase64, 'base64');
        const part2 = Buffer.from(part2Hex, 'hex');
        const part3 = Buffer.from(part3Hex, 'hex');

        console.log(`[DECRYPT v5] Part2 length: ${part2.length} bytes`);
        console.log(`[DECRYPT v5] Part3 length: ${part3.length} bytes`);

        // Method 1: AES-128-CBC - part2 as key (16 bytes), part3 zero-padded to 16
        if (part2.length === 16) {
            console.log('[DECRYPT v5] Method 1: AES-128-CBC with zero-padded IV...');
            const iv = Buffer.alloc(16);
            part3.copy(iv, 0); // Copy part3, rest is zeros
            
            try {
                const decipher = crypto.createDecipheriv('aes-128-cbc', part2, iv);
                decipher.setAutoPadding(true);
                let decrypted = decipher.update(encrypted);
                decrypted = Buffer.concat([decrypted, decipher.final()]);
                const url = decrypted.toString('utf8');
                
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    console.log(`[DECRYPT v5] ✓ Method 1 SUCCESS: ${url.substring(0, 50)}...`);
                    return url;
                }
            } catch (err) {
                console.log(`[DECRYPT v5] ✗ Method 1 failed: ${err.message}`);
            }
        }

        // Method 2: AES-128-CBC - part2 as key, part3 repeated to 16 bytes
        if (part2.length === 16 && part3.length === 8) {
            console.log('[DECRYPT v5] Method 2: AES-128-CBC with repeated IV...');
            const iv = Buffer.concat([part3, part3]);
            
            try {
                const decipher = crypto.createDecipheriv('aes-128-cbc', part2, iv);
                decipher.setAutoPadding(true);
                let decrypted = decipher.update(encrypted);
                decrypted = Buffer.concat([decrypted, decipher.final()]);
                const url = decrypted.toString('utf8');
                
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    console.log(`[DECRYPT v5] ✓ Method 2 SUCCESS: ${url.substring(0, 50)}...`);
                    return url;
                }
            } catch (err) {
                console.log(`[DECRYPT v5] ✗ Method 2 failed: ${err.message}`);
            }
        }

        // Method 3: AES-256-CBC - use part2 as first half of key
        if (part2.length === 16) {
            console.log('[DECRYPT v5] Method 3: AES-256-CBC (part2 doubled as key)...');
            const key256 = Buffer.concat([part2, part2]); // 32 bytes
            const iv = Buffer.alloc(16);
            part3.copy(iv, 0);
            
            try {
                const decipher = crypto.createDecipheriv('aes-256-cbc', key256, iv);
                decipher.setAutoPadding(true);
                let decrypted = decipher.update(encrypted);
                decrypted = Buffer.concat([decrypted, decipher.final()]);
                const url = decrypted.toString('utf8');
                
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    console.log(`[DECRYPT v5] ✓ Method 3 SUCCESS: ${url.substring(0, 50)}...`);
                    return url;
                }
            } catch (err) {
                console.log(`[DECRYPT v5] ✗ Method 3 failed: ${err.message}`);
            }
        }

        // Method 4: Try ECB mode (no IV)
        if (part2.length === 16) {
            console.log('[DECRYPT v5] Method 4: AES-128-ECB (no IV)...');
            
            try {
                const decipher = crypto.createDecipheriv('aes-128-ecb', part2, Buffer.alloc(0));
                decipher.setAutoPadding(true);
                let decrypted = decipher.update(encrypted);
                decrypted = Buffer.concat([decrypted, decipher.final()]);
                const url = decrypted.toString('utf8');
                
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    console.log(`[DECRYPT v5] ✓ Method 4 SUCCESS: ${url.substring(0, 50)}...`);
                    return url;
                }
            } catch (err) {
                console.log(`[DECRYPT v5] ✗ Method 4 failed: ${err.message}`);
            }
        }

        // Method 5: Use part2+part3 concatenated as 24-byte key (AES-192)
        if (part2.length === 16 && part3.length === 8) {
            console.log('[DECRYPT v5] Method 5: AES-192-CBC (part2+part3 as key)...');
            const key192 = Buffer.concat([part2, part3]); // 24 bytes
            const iv = Buffer.alloc(16, 0);
            
            try {
                const decipher = crypto.createDecipheriv('aes-192-cbc', key192, iv);
                decipher.setAutoPadding(true);
                let decrypted = decipher.update(encrypted);
                decrypted = Buffer.concat([decrypted, decipher.final()]);
                const url = decrypted.toString('utf8');
                
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    console.log(`[DECRYPT v5] ✓ Method 5 SUCCESS: ${url.substring(0, 50)}...`);
                    return url;
                }
            } catch (err) {
                console.log(`[DECRYPT v5] ✗ Method 5 failed: ${err.message}`);
            }
        }

        console.error('[DECRYPT v5] All methods failed');
        return null;

    } catch (error) {
        console.error(`[DECRYPT v5] Exception: ${error.message}`);
        return null;
    }
}

module.exports = { decryptVKAudio };
