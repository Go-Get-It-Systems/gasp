import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/gasp';
const client = postgres(DATABASE_URL);
const db = drizzle(client);

console.log('\n=== business_followers ===');
const follows = await db.execute(sql`SELECT * FROM business_followers`);
for (const f of follows) console.log(JSON.stringify(f));

console.log('\n=== business_workspaces ===');
const ws = await db.execute(sql`SELECT id, handle, display_name, follower_count, following_count FROM business_workspaces`);
for (const w of ws) console.log(JSON.stringify(w));

console.log('\n=== users ===');
const users = await db.execute(sql`SELECT id, username, account_type FROM users`);
for (const u of users) console.log(JSON.stringify(u));

await client.end();
process.exit(0);
