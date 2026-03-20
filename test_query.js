const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey || supabaseKey);

async function main() {
  console.log("Checking messages...");
  const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(5);
  console.log(JSON.stringify(data, null, 2));
  if (error) console.error(error);
  
  console.log("Checking message_reactions...");
  const { data: reactData, error: reactError } = await supabase.from('message_reactions').select('*').limit(5);
  console.log(JSON.stringify(reactData, null, 2));
  if (reactError) console.error(reactError);
}

main();
