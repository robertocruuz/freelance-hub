import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, name, due_date, status, is_recurring')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error fetching invoices:', error);
  } else {
    console.log('--- RECENT INVOICES ---');
    console.log(data);
  }

  const { data: ex, error: errEx } = await supabase
    .from('expenses')
    .select('id, description, due_date, status, is_recurring')
    .order('created_at', { ascending: false })
    .limit(10);

  if (errEx) {
    console.error('Error fetching expenses:', errEx);
  } else {
    console.log('--- RECENT EXPENSES ---');
    console.log(ex);
  }
}

main();
