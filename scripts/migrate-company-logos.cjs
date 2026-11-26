// Replace legacy Clearbit avatars in the local database; keep a reversible backup.
// Usage: node scripts/migrate-company-logos.cjs <backend-directory> [--apply]
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');

const backendPath = path.resolve(process.argv[2] || '../gasp-backend');
const loadBackend = createRequire(path.join(backendPath, 'package.json'));
const settings = loadBackend('dotenv').parse(fs.readFileSync(path.join(backendPath, '.env')));
const database = new URL(settings.DATABASE_URL);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(database.hostname) || database.pathname !== '/gasp') {
  throw new Error('This migration supports only the local gasp database.');
}
const sql = loadBackend('postgres')(settings.DATABASE_URL, { max: 1, connect_timeout: 5 });
function replacement(uri) {
  const legacy = new URL(uri);
  const domain = decodeURIComponent(legacy.pathname.slice(1).replace(/\/$/, '')).toLowerCase();
  if (legacy.hostname !== 'logo.clearbit.com' || legacy.username || legacy.password
      || !/^[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(domain)) throw new Error('Unexpected legacy logo URL.');
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

(async () => {
  try {
    await sql.begin('isolation level serializable', async tx => {
      await tx`select pg_advisory_xact_lock(hashtext('gasp-company-logo-migration'))`;
      await tx.unsafe("SET LOCAL lock_timeout = '5s'");
      const businesses = await tx`select id,handle,avatar_url,updated_at from business_workspaces
        where avatar_url ~* '^https?://logo[.]clearbit[.]com/' order by id for update`;
      const accounts = await tx`select id,username,avatar_url,updated_at from users
        where account_type='business' and avatar_url ~* '^https?://logo[.]clearbit[.]com/' order by id for update`;
      // Validate every replacement before writing any data.
      const changes = [...businesses.map(row => ({ table: 'business_workspaces', name: row.handle, ...row })),
        ...accounts.map(row => ({ table: 'users', name: row.username, ...row }))]
        .map(row => ({ ...row, replacement: replacement(row.avatar_url) }));
      console.log(JSON.stringify({ businesses: businesses.length, accounts: accounts.length,
        changes: changes.map(row => ({ table: row.table, name: row.name, from: row.avatar_url, to: row.replacement })) }));
      if (!process.argv.includes('--apply') || !changes.length) return;
      const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gasp-company-logos-'));
      const backupFile = path.join(backupDir, 'before.json');
      fs.writeFileSync(backupFile, JSON.stringify({ createdAt: new Date().toISOString(), businesses, accounts }, null, 2), { mode: 0o600 });
      console.log('Backup: ' + backupFile);
      for (const change of changes) {
        const updated = change.table === 'business_workspaces'
          ? await tx`update business_workspaces set avatar_url=${change.replacement},updated_at=now()
              where id=${change.id} and avatar_url=${change.avatar_url} returning id`
          : await tx`update users set avatar_url=${change.replacement},updated_at=now()
              where id=${change.id} and avatar_url=${change.avatar_url} returning id`;
        if (updated.length !== 1) throw new Error('Avatar changed concurrently; migration rolled back.');
      }
      console.log('Updated ' + changes.length + ' avatar URLs.');
    });
    console.log(process.argv.includes('--apply') ? 'Migration committed.' : 'Read only. Pass --apply to migrate.');
  } catch (error) {
    console.error('Migration stopped; transaction rolled back: ' + error.message);
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 1 });
  }
})();
