import type { VercelRequest, VercelResponse } from '@vercel/node';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8329660734:AAE66mn6hkOOlK2SQeA97PP7JjLEPkFjkOk';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '7443672526';

interface ErrorAlertPayload {
  action?: string;
  error?: string;
  user?: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
  };
  context?: Record<string, any>;
  url?: string;
  userAgent?: string;
  timestamp?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow cross-origin requests from our frontend
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.status(500).json({ error: 'Telegram credentials not configured' });
  }

  try {
    const body: ErrorAlertPayload = req.body || {};
    const { action = 'Platform Error', error = 'Unknown error occurred', user, context, url } = body;

    const time = new Date().toLocaleString('en-KE', {
      timeZone: 'Africa/Nairobi',
      dateStyle: 'medium',
      timeStyle: 'medium',
    });

    const userText = user
      ? `👤 <b>User:</b> ${user.name || 'Anonymous'} (${user.email || 'No email'}) [<code>${user.role || 'user'}</code>]`
      : `👤 <b>User:</b> Guest / Unauthenticated`;

    let contextText = '';
    if (context && Object.keys(context).length > 0) {
      try {
        const prettyContext = Object.entries(context)
          .map(([k, v]) => `• <b>${k}:</b> <code>${String(v)}</code>`)
          .join('\n');
        contextText = `\n📋 <b>Details:</b>\n${prettyContext}`;
      } catch {}
    }

    const message = [
      `🚨 <b>TGD PLATFORM ERROR ALERT</b>`,
      `━━━━━━━━━━━━━━━━━━`,
      `⚡ <b>Action:</b> ${escapeHtml(action)}`,
      userText,
      `📍 <b>Page:</b> ${url ? escapeHtml(url) : 'N/A'}`,
      `🕒 <b>Time:</b> ${time} EAT`,
      `━━━━━━━━━━━━━━━━━━`,
      `❌ <b>Error:</b>`,
      `<code>${escapeHtml(String(error).substring(0, 700))}</code>`,
      contextText,
    ].filter(Boolean).join('\n');

    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data: any = await response.json();
    if (!response.ok || !data?.ok) {
      console.error('Telegram API error:', data);
      return res.status(502).json({ error: 'Failed to send Telegram message', details: data });
    }

    return res.status(200).json({ success: true, delivered: true });
  } catch (err: any) {
    console.error('Telegram alert handler error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err?.message });
  }
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

