import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gitkzykasegtygoybjhq.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_fqQBtrYzbflSgtEQAj3caA_5nr0dLJq';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabase() {
    console.log('Testing Supabase connection...');

    const { data, error } = await supabase.from('users').insert({
        uid: 'test_uid_123',
        name: 'Testy Tester',
        email: 'test@example.com',
        avatar: '',
        role: 'subscriber'
    }).select();

    if (error) {
        console.error('SUPABASE ERROR:', error);
    } else {
        console.log('SUCCESS:', data);
    }
}

testSupabase();
