import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: channels, error: cErr } = await supabase.from('channels').select('*');
  console.log('CHANNELS:', channels);
  
  const { data: messages, error: mErr } = await supabase.from('messages').select('*');
  console.log('MESSAGES:', messages);
}

check();
