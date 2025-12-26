/**
 * CS2 Share Code Decoder
 * Decodes CS2 match share codes to extract matchId, outcomeId, and tokenId
 * 
 * Share Code format: CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
 * Example: CSGO-ABCDE-FGHIJ-KLMNO-PQRST-UVWXY
 */

// CS2/CSGO share codes use a custom base-57 alphabet that EXCLUDES visually ambiguous characters:
// Excluded: I (capital i), O (capital o), l (lowercase L), 0 (zero), 1 (one)
// Reference implementations (third-party parsers) use this dictionary.
const DICTIONARY = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789';
const DICTIONARY_LENGTH = BigInt(DICTIONARY.length);

/**
 * Decode a CS2 share code to get match details
 * @param {string} shareCode - The share code (with or without CSGO- prefix)
 * @returns {Object} Object with matchId, outcomeId, tokenId
 */
function decodeShareCode(shareCode) {
  // Remove "CSGO-" prefix and dashes
  const code = shareCode.replace(/CSGO-/gi, '').replace(/-/g, '');
  
  if (code.length !== 25) {
    throw new Error('Invalid share code length. Expected 25 characters.');
  }

  // Convert the share code to a big number
  let big = BigInt(0);
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const index = DICTIONARY.indexOf(char);
    
    if (index === -1) {
      throw new Error(`Invalid character '${char}' in share code. Allowed characters exclude I,O,l,0,1.`);
    }
    
    big = big * DICTIONARY_LENGTH + BigInt(index);
  }

  // Extract the components from the big number
  // Encoding order in share code (low to high bits):
  // matchId: 64 bits (lowest)
  // outcomeId: 64 bits (middle)
  // tokenId: 16 bits (highest)
  
  const matchId = big & BigInt('0xFFFFFFFFFFFFFFFF');
  big = big >> BigInt(64);
  
  const outcomeId = big & BigInt('0xFFFFFFFFFFFFFFFF');
  big = big >> BigInt(64);
  
  const tokenId = Number(big & BigInt(0xFFFF));

  return {
    matchId: matchId.toString(),
    outcomeId: outcomeId.toString(),
    tokenId: tokenId,
    shareCode: shareCode
  };
}

/**
 * Normalize share code - add dashes if missing
 * @param {string} shareCode - Share code with or without dashes
 * @returns {string} Normalized share code with dashes
 */
function normalizeShareCode(shareCode) {
  if (!shareCode) return shareCode;
  
  // Remove CSGO- prefix
  let code = shareCode.replace(/^CSGO-/i, '');
  
  // Remove all dashes
  code = code.replace(/-/g, '');
  
  // If 25 characters, add dashes in correct positions
  if (code.length === 25) {
    return `CSGO-${code.slice(0,5)}-${code.slice(5,10)}-${code.slice(10,15)}-${code.slice(15,20)}-${code.slice(20,25)}`;
  }
  
  // Return original if not 25 chars
  return shareCode;
}

/**
 * Validate a CS2 share code format
 * @param {string} shareCode - The share code to validate
 * @returns {boolean} True if valid format
 */
function isValidShareCode(shareCode) {
  if (!shareCode || typeof shareCode !== 'string') {
    return { valid: false, error: 'Share code is empty' };
  }

  // Remove prefix and dashes
  const raw = shareCode.replace(/^CSGO-/i, '').replace(/-/g, '');
  if (raw.length !== 25) {
    return { valid: false, error: `Invalid length ${raw.length}, expected 25 characters` };
  }

  // Collect invalid characters
  const invalid = [];
  for (const ch of raw) {
    if (!DICTIONARY.includes(ch)) {
      invalid.push(ch);
    }
  }
  if (invalid.length) {
    return { valid: false, error: `Invalid characters: ${invalid.join(', ')}`, invalid };
  }

  try {
    decodeShareCode(shareCode);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

/**
 * Format a share code with proper spacing
 * @param {string} code - Raw code without spaces
 * @returns {string} Formatted code like CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
 */
function formatShareCode(code) {
  // Remove existing formatting
  const clean = code.replace(/CSGO-/gi, '').replace(/-/g, '').replace(/\s/g, '');
  
  if (clean.length !== 25) {
    throw new Error('Invalid code length');
  }

  // Split into groups of 5
  const groups = [];
  for (let i = 0; i < clean.length; i += 5) {
    groups.push(clean.substr(i, 5));
  }

  return `CSGO-${groups.join('-')}`;
}

module.exports = {
  decodeShareCode,
  isValidShareCode,
  formatShareCode,
  normalizeShareCode
};
