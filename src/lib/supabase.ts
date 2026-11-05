import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env';

export const supabaseUrl = getEnv('VITE_SUPABASE_URL', 'https://gitkzykasegtygoybjhq.supabase.co');
export const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
