import { describe, it } from 'node:test';
import assert from 'node:assert';
import { stripDigits, validateChatMessage } from '../src/lib/chatFilter';

describe('Chat Safety Filter (chatFilter)', () => {
  it('strips literal numeric digits from string', () => {
    assert.strictEqual(stripDigits('Call 0712345678'), 'Call ');
    assert.strictEqual(stripDigits('Price is 500 KES'), 'Price is  KES');
  });

  it('rejects messages containing raw numbers', () => {
    const res = validateChatMessage('Hey hit my line 0722000000');
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.hadDigits, true);
    assert.match(res.reason || '', /Numbers are strictly prohibited/i);
  });

  it('rejects messages attempting off-platform contact sharing (WhatsApp/Telegram/M-Pesa)', () => {
    const wa = validateChatMessage('Chat with me on WhatsApp');
    assert.strictEqual(wa.isValid, false);

    const tg = validateChatMessage('Join my telegram group t.me/vip');
    assert.strictEqual(tg.isValid, false);

    const mp = validateChatMessage('Send to my mpesa number');
    assert.strictEqual(mp.isValid, false);
  });

  it('detects and rejects spelled-out digits (English and Swahili)', () => {
    const resEng = validateChatMessage('You can find me on zero seven two two one eight');
    assert.strictEqual(resEng.isValid, false);
    assert.match(resEng.reason || '', /Spelling out phone numbers/i);

    const resSwa = validateChatMessage('Nipe yako sifuri saba mbili tatu moja');
    assert.strictEqual(resSwa.isValid, false);
    assert.match(resSwa.reason || '', /Spelling out phone numbers/i);
  });

  it('permits clean, legitimate conversational messages', () => {
    const res = validateChatMessage('Hey beautiful, absolutely loved your latest dance post!');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.hadDigits, false);
    assert.strictEqual(res.sanitized, 'Hey beautiful, absolutely loved your latest dance post!');
  });
});
