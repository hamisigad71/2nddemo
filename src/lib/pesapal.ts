// Pesapal API v3 Service Integration
// Credentials provided: Consumer Key & Secret

const PESAPAL_CONSUMER_KEY = import.meta.env.VITE_PESAPAL_CONSUMER_KEY || 'qkio1BGGYAXTu2JOfm7XSXNruoZsrqEW';
const PESAPAL_CONSUMER_SECRET = import.meta.env.VITE_PESAPAL_CONSUMER_SECRET || 'osGQ364R49cXKeOYSpaOnT++rHs=';

// Environment selector (Default to Live Production endpoint; set VITE_PESAPAL_ENV="sandbox" for testing)
const IS_LIVE = import.meta.env.VITE_PESAPAL_ENV !== 'sandbox';

const PROXY_LIVE_URL = '/pesapal-api';
const PROXY_SANDBOX_URL = '/pesapal-sandbox';

const DIRECT_LIVE_URL = 'https://pay.pesapal.com/v3';
const DIRECT_SANDBOX_URL = 'https://cyb3rpay.pesapal.com/pesapalv3';

export interface PesapalOrderRequest {
  id: string;
  currency: string;
  amount: number;
  description: string;
  callback_url: string;
  notification_id?: string;
  billing_address: {
    email_address: string;
    phone_number?: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface PesapalAuthTokenResponse {
  token?: string;
  expiryDate?: string;
  error?: any;
  status?: string;
  message?: string;
}

/**
 * Request OAuth2 Auth Token from Pesapal endpoint
 */
export const getPesapalAuthToken = async (): Promise<{ token: string | null; baseUrl: string; error?: string }> => {
  const tryFetchToken = async (baseUrl: string) => {
    try {
      const response = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          consumer_key: PESAPAL_CONSUMER_KEY,
          consumer_secret: PESAPAL_CONSUMER_SECRET
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return { token: null, error: `HTTP ${response.status}: ${errText}` };
      }

      const data: PesapalAuthTokenResponse = await response.json();
      if (data.token) {
        return { token: data.token, error: undefined };
      }
      return { token: null, error: data.message || JSON.stringify(data.error) };
    } catch (err: any) {
      return { token: null, error: err.message || 'Network Error' };
    }
  };

  // Order endpoints depending on IS_LIVE flag
  const endpoints = IS_LIVE
    ? [PROXY_LIVE_URL, DIRECT_LIVE_URL, PROXY_SANDBOX_URL, DIRECT_SANDBOX_URL]
    : [PROXY_SANDBOX_URL, DIRECT_SANDBOX_URL, PROXY_LIVE_URL, DIRECT_LIVE_URL];

  let lastError = '';

  for (const endpoint of endpoints) {
    const result = await tryFetchToken(endpoint);
    if (result.token) {
      return { token: result.token, baseUrl: endpoint };
    }
    if (result.error) lastError = result.error;
  }

  return { token: null, baseUrl: IS_LIVE ? PROXY_LIVE_URL : PROXY_SANDBOX_URL, error: lastError };
};

/**
 * Register IPN URL dynamically
 */
export const getOrRegisterIPNId = async (token: string, baseUrl: string): Promise<string | null> => {
  try {
    const cacheKey = `pesapal_ipn_id_${baseUrl.includes('sandbox') ? 'sandbox' : 'live'}`;
    const cachedIpnId = localStorage.getItem(cacheKey);
    if (cachedIpnId) return cachedIpnId;

    const response = await fetch(`${baseUrl}/api/URLSetup/RegisterIPN`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        url: `${window.location.origin}/user`,
        ipn_notification_type: 'GET'
      })
    });

    const data = await response.json();
    if (data.ipn_id) {
      localStorage.setItem(cacheKey, data.ipn_id);
      return data.ipn_id;
    }
    return null;
  } catch (err) {
    console.error('Failed to register Pesapal IPN:', err);
    return null;
  }
};

/**
 * Create Order & Get Payment Redirect URL
 */
export const submitPesapalOrder = async (order: PesapalOrderRequest): Promise<{ redirect_url?: string; order_tracking_id?: string; error?: string } | null> => {
  try {
    const { token, baseUrl, error: authError } = await getPesapalAuthToken();
    if (!token) {
      return { error: authError || 'Failed to authenticate with Pesapal servers.' };
    }

    const ipnNotificationId = await getOrRegisterIPNId(token, baseUrl);
    if (!ipnNotificationId) {
      return { error: 'Failed to generate valid IPN Notification ID from Pesapal.' };
    }

    const payload = {
      id: order.id,
      currency: order.currency || 'KES',
      amount: order.amount,
      description: order.description,
      callback_url: order.callback_url || `${window.location.origin}/user`,
      notification_id: ipnNotificationId,
      billing_address: {
        email_address: order.billing_address.email_address,
        phone_number: order.billing_address.phone_number || '',
        first_name: order.billing_address.first_name || 'Fan',
        last_name: order.billing_address.last_name || 'User'
      }
    };

    const response = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return { error: `HTTP ${response.status}: ${errText}` };
    }

    const data = await response.json();
    if (data.redirect_url && data.order_tracking_id) {
      return {
        redirect_url: data.redirect_url,
        order_tracking_id: data.order_tracking_id
      };
    }

    return { error: data.message || data.error?.message || 'Pesapal did not return a checkout URL.' };
  } catch (error: any) {
    console.error('Error submitting Pesapal Order:', error);
    return { error: error.message || 'Network error while contacting Pesapal' };
  }
};
