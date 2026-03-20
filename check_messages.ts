import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  const { data, error } = await supabase.from('messages').select('id, content, deleted_at').not('deleted_at', 'is', null);
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

main();
