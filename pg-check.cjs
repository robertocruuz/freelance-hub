const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.jusfjpyxfdosoohtqhrb:RobertoCruz123@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  await client.connect();
  const res = await client.query(`
    select created_at, title, message 
    from notifications 
    order by created_at desc 
    limit 10
  `);
  console.log(res.rows);
  await client.end();
}

run().catch(console.error);
