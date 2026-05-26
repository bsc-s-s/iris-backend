const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.emhqfkdeeuqgojvjonkg:S3guridad2023%23@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
});
client.connect().then(async () => {
  const res = await client.query(
    `UPDATE "User" SET "mfaSecret" = 'c4719233a63fc82aa6e3d816a8fb1b85fbccb43b' WHERE email = 'brianburgoa@gmail.com' RETURNING id, email, "mfaSecret", "mfaEnabled"`
  );
  console.log('Updated:', JSON.stringify(res.rows[0]));
  await client.end();
}).catch(e => console.error(e.message));
