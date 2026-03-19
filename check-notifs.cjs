const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, message, user_id, created_at, link')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('Last 10 notifications:');
  console.dir(data, { depth: null });
}

check();
