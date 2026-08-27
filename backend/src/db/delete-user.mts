import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/gasp';
const client = postgres(DATABASE_URL);
const db = drizzle(client);

const username = process.argv[2];
if (!username) {
  console.error('Usage: npx tsx src/db/delete-user.mts <username>');
  process.exit(1);
}

const found = await db.execute(sql`
  SELECT id, username, display_name FROM users WHERE LOWER(username) = ${username.toLowerCase()}
`);

if (found.length === 0) {
  // list all
  const all = await db.execute(sql`SELECT id, username, display_name, account_type FROM users ORDER BY created_at DESC`);
  console.log('User not found. All users:');
  for (const u of all) console.log(' ', JSON.stringify(u));
  await client.end();
  process.exit(1);
}

const user = found[0] as any;
console.log(`Deleting: ${user.display_name} (@${user.username}) id=${user.id}`);

await db.execute(sql`DELETE FROM users WHERE id = ${user.id}`);
console.log(`✓ Deleted @${user.username}`);

await client.end();
process.exit(0);
