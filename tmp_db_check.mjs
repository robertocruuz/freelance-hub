import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://iqynnwjibwupdwmbksao.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeW5ud2ppYnd1cGR3bWJrc2FvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjMyMDEsImV4cCI6MjA4Nzc5OTIwMX0.jmxqjHe-t0G4ieXno6fGlxWilyuCnrHX5KuNWCljKso";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data, error } = await supabase.from('invoices').select('*');
  console.log('Invoices count:', data ? data.length : 0);
  console.log('Invoices Data:', JSON.stringify(data, null, 2));
  if (error) console.error('Error:', error);
}

run();
