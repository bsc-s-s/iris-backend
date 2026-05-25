const { Client } = require('pg');
async function run() {
  const url = 'postgresql://postgres.emhqfkdeeuqgojvjonkg:S3guridad2023%23@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY table_schema, table_name");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
run().catch(e => console.error(e.message));
