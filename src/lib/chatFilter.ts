/**
 * Chat Filter & Anti-Circumvention Module
 * Blocks direct digits, formatted phone numbers, spelled-out digits,
 * and off-platform contact sharing (WhatsApp, Telegram, M-Pesa phone numbers).
 */

// Common English and Swahili number words
const NUMBER_WORDS: Record<string, string> = {
  'zero': '0', 'sifuri': '0', 'oh': '0', 'o': '0',
  'one': '1', 'moja': '1',
  'two': '2', 'mbili': '2',
  'three': '3', 'tatu': '3',
  'four': '4', 'nne': '4',
  'five': '5', 'tano': '5',
  'six': '6', 'sita': '6',
  'seven': '7', 'saba': '7',
  'eight': '8', 'nane': '8',
  'nine': '9', 'tisa': '9',
  'ten': '10', 'kumi': '10',
};

// Patterns for off-platform social handles or call requests
const OFF_PLATFORM_KEYWORDS = [
  /\bwhatsapp\b/i,
  /\bwa\.me\b/i,
  /\btelegram\b/i,
  /\bt\.me\b/i,
  /\bsnapchat\b/i,
  /\bcall\s*me\b/i,
  /\bcall\s*my\b/i,
  /\bmpesa\s*(number|no|direct)\b/i,
  /\bmy\s*(phone|cell|digits|number|no|contact)\b/i,
  /\b(text|reach|hit)\s*me\s*on\b/i,
  /\b(saf\s*line|airtel\s*line)\b/i,
];

/**
 * Strips all literal numeric digits from input text
 */
export const stripDigits = (text: string): string => {
  return text.replace(/[0-9]/g, '');
};

export interface ChatValidationResult {
  isValid: boolean;
  sanitized: string;
  hadDigits: boolean;
  reason?: string;
}

/**
 * Validates and sanitizes a message before sending or while typing.
 */
export const validateChatMessage = (text: string): ChatValidationResult => {
  const hadDigits = /[0-9]/.test(text);
  const sanitized = stripDigits(text);

  // Check for literal digits
  if (hadDigits) {
    return {
      isValid: false,
      sanitized,
      hadDigits: true,
      reason: 'Numbers are strictly prohibited in chat for creator safety & privacy.',
    };
  }

  // Check for off-platform contact keywords
  for (const pattern of OFF_PLATFORM_KEYWORDS) {
    if (pattern.test(text)) {
      return {
        isValid: false,
        sanitized,
        hadDigits: false,
        reason: 'Sharing external phone numbers or messaging handles is prohibited.',
      };
    }
  }

  // Check for spelled-out phone sequences (e.g. "zero seven two two...")
  const tokens = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  let consecutiveNumberWords = 0;
  for (const token of tokens) {
    if (NUMBER_WORDS[token] !== undefined) {
      consecutiveNumberWords++;
      if (consecutiveNumberWords >= 3) {
        return {
          isValid: false,
          sanitized,
          hadDigits: false,
          reason: 'Spelling out phone numbers or contact details is not allowed.',
        };
      }
    } else {
      consecutiveNumberWords = 0;
    }
  }

  return {
    isValid: true,
    sanitized,
    hadDigits: false,
  };
};

