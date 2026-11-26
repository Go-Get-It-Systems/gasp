// Reconcile the legacy local Studio database with the backend's migrations.
// Usage: node scripts/repair-local-business-db.cjs <backend-directory> [--apply]
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');

const backendPath = path.resolve(process.argv[2] || '../gasp-backend');
const loadBackend = createRequire(path.join(backendPath, 'package.json'));
const config = loadBackend('dotenv').parse(fs.readFileSync(path.join(backendPath, '.env')));
const database = new URL(config.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) || database.pathname !== '/gasp') {
  throw new Error('This repair only supports the local gasp database.');
}
const sql = loadBackend('postgres')(config.DATABASE_URL, { max: 1, connect_timeout: 5, onnotice() {} });
const migrationsPath = path.join(backendPath, 'src/db/migrations');
const journal = JSON.parse(fs.readFileSync(path.join(migrationsPath, 'meta/_journal.json'), 'utf8'));
const quote = (value) => '"' + value.replaceAll('"', '""') + '"';
const tables = ['business_workspaces', 'business_members', 'business_followers', 'business_campaigns',
  'campaign_deliveries', 'campaign_reactions', 'campaign_reaction_selections', 'gasps', 'gasp_moments', 'reactions'];

async function repair(tx) {
  await tx`select pg_advisory_xact_lock(hashtext('gasp-local-business-upgrade'))`;
  await tx.unsafe("SET LOCAL lock_timeout = '5s'");
  await tx.unsafe("SET LOCAL statement_timeout = '45s'");
  const columns = await tx`select table_name, column_name, data_type, udt_name, column_default, is_nullable
    from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position`;
  const has = (table, column) => columns.some((row) => row.table_name === table && row.column_name === column);
  const entries = await tx`select id, hash, created_at from drizzle.__drizzle_migrations order by created_at`;
  const pending = journal.entries.filter((entry) => !entries.some((row) => Number(row.created_at) === entry.when));
  if (pending.some((entry) => entry.idx < 5 || entry.idx > 7)) throw new Error('Unexpected migration history; repair stopped.');
  if (!has('business_workspaces', 'is_verified') || !has('business_campaigns', 'is_replayable') || !has('campaign_deliveries', 'status')) {
    throw new Error('This is not the supported legacy Studio schema.');
  }
  for (const entry of journal.entries.filter((row) => row.idx < 5)) {
    const source = fs.readFileSync(path.join(migrationsPath, entry.tag + '.sql'), 'utf8');
    const hash = createHash('sha256').update(source).digest('hex');
    if (!entries.some((row) => Number(row.created_at) === entry.when && row.hash === hash)) {
      throw new Error('Existing migration hashes do not match the backend.');
    }
  }
  console.log(JSON.stringify({ pendingMigrations: pending.map((entry) => entry.tag),
    missingVerificationStatus: !has('business_workspaces', 'verification_status') }));
  if (!process.argv.includes('--apply')) return;
  if (!pending.length) return;

  // Back up affected data and schema metadata outside the repository before DDL.
  const backup = { columns, migrations: entries, rows: {}, constraints: await tx`
    select conrelid::regclass::text as table_name, conname, pg_get_constraintdef(oid) as definition
    from pg_constraint where connamespace = 'public'::regnamespace`, indexes: await tx`
    select tablename, indexname, indexdef from pg_indexes where schemaname = 'public'`, enums: await tx`
    select t.typname, e.enumlabel from pg_type t join pg_enum e on t.oid = e.enumtypid order by e.enumsortorder` };
  for (const table of tables.filter((name) => columns.some((row) => row.table_name === name))) {
    backup.rows[table] = await tx.unsafe(`select * from ${quote(table)} order by id`);
  }
  const backupFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'gasp-business-backup-'));
  const backupFile = path.join(backupFolder, 'before.json');
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), { mode: 0o600 });
  console.log('Backup: ' + backupFile);

  async function add(table, column, definition) {
    if (!has(table, column)) await tx.unsafe(`alter table ${quote(table)} add column ${quote(column)} ${definition}`);
  }
  await add('business_workspaces', 'verification_status', "varchar(20) not null default 'pending'");
  if (!has('business_workspaces', 'verification_status')) {
    // Preserve the existing verification decision; do not verify new accounts.
    await tx`update business_workspaces set verification_status = case when is_verified then 'verified' else 'pending' end`;
  }
  await add('business_campaigns', 'owner_user_id', 'text');
  if (!has('business_campaigns', 'owner_user_id')) {
    const ambiguous = await tx`select c.id from business_campaigns c left join business_members m
      on m.workspace_id = c.workspace_id and m.role = 'owner' and m.is_active
      group by c.id having count(m.id) <> 1`;
    if (ambiguous.length) throw new Error('Campaign ownership is ambiguous; no changes committed.');
    await tx`update business_campaigns c set owner_user_id = m.user_id from business_members m
      where m.workspace_id = c.workspace_id and m.role = 'owner' and m.is_active`;
    await tx.unsafe('alter table business_campaigns alter column owner_user_id set not null');
  }
  await add('business_campaigns', 'media_type', 'varchar(10)');
  if (!has('business_campaigns', 'media_type')) {
    await tx`update business_campaigns set media_type = case
      when split_part(media_url, '?', 1) ~* '\\.(jpe?g|png|webp|gif|avif|heic)$' then 'image'
      when split_part(media_url, '?', 1) ~* '\\.(mp4|mov|webm|m4v)$' then 'video' else null end`;
    const [unknown] = await tx`select count(*)::int as count from business_campaigns where media_type is null`;
    if (unknown.count) throw new Error('Legacy media type cannot be determined; no changes committed.');
    await tx.unsafe('alter table business_campaigns alter column media_type set not null');
  }
  await add('business_campaigns', 'blurhash', 'varchar(100)');
  await add('business_campaigns', 'replayable', 'boolean not null default false');
  if (!has('business_campaigns', 'replayable')) await tx`update business_campaigns set replayable = is_replayable`;
  await add('business_campaigns', 'audience_snapshot_count', 'integer not null default 0');
  if (!has('business_campaigns', 'audience_snapshot_count')) await tx`update business_campaigns c set
    audience_snapshot_count = (select count(*)::int from campaign_deliveries d where d.campaign_id = c.id)`;
  await add('business_campaigns', 'publish_error', 'varchar(200)');

  await add('campaign_deliveries', 'gasp_id', 'text');
  if (!has('campaign_deliveries', 'gasp_id')) await tx`update campaign_deliveries d set gasp_id = (
    select min(g.id) from gasps g where g.campaign_id = d.campaign_id and g.recipient_id = d.recipient_id
    having count(*) = 1)`;
  await add('campaign_deliveries', 'state', "varchar(20) not null default 'queued'");
  if (!has('campaign_deliveries', 'state')) await tx`update campaign_deliveries set state = case
    when status::text in ('opened', 'viewed') then 'delivered' else status::text end`;
  await add('campaign_deliveries', 'failure_code', 'varchar(80)');
  // Legacy rows record only their final status. Use their last update for these
  // inferred timestamps, retaining the original status and dates for reference.
  for (const [column, statuses] of [['delivered_at', ['delivered', 'opened', 'viewed']],
    ['opened_at', ['opened', 'viewed']], ['viewed_at', ['viewed']]]) {
    await add('campaign_deliveries', column, 'timestamp with time zone');
    if (!has('campaign_deliveries', column)) await tx.unsafe(
      `update campaign_deliveries set ${quote(column)} = updated_at where status::text = any($1::text[])`, [statuses]);
  }
  await add('campaign_reactions', 'consent_to_feature', 'boolean not null default false');
  await add('campaign_reactions', 'consent_at', 'timestamp with time zone');
  await add('campaign_reactions', 'updated_at', 'timestamp with time zone not null default now()');
  if (!has('campaign_reactions', 'updated_at')) await tx`update campaign_reactions set updated_at = created_at`;

  // Apply the checked-in migrations with existence guards for manually created
  // legacy objects. Retain their original hashes in Drizzle's migration ledger.
  for (const entry of pending) {
    const source = fs.readFileSync(path.join(migrationsPath, entry.tag + '.sql'), 'utf8');
    for (let statement of source.split('--> statement-breakpoint').map((part) => part.trim()).filter(Boolean)) {
      const constraint = statement.match(/^ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)"/);
      if (constraint) {
        const existing = await tx`select 1 from pg_constraint where conrelid = ${constraint[1]}::regclass and conname = ${constraint[2]}`;
        if (existing.length) continue;
      }
      if (statement.startsWith('CREATE TYPE')) {
        const existing = await tx`select 1 from pg_type where typname = 'account_type' and typnamespace = 'public'::regnamespace`;
        if (existing.length) continue;
      }
      statement = statement.replace(/^CREATE TABLE /, 'CREATE TABLE IF NOT EXISTS ')
        .replace(/^CREATE INDEX /, 'CREATE INDEX IF NOT EXISTS ')
        .replace(/^(ALTER TABLE "[^"]+" ADD COLUMN) /, '$1 IF NOT EXISTS ');
      await tx.unsafe(statement);
    }
    await tx`insert into drizzle.__drizzle_migrations (hash, created_at)
      values (${createHash('sha256').update(source).digest('hex')}, ${entry.when})`;
    console.log('Applied: ' + entry.tag);
  }
  for (const [table, rows] of Object.entries(backup.rows)) {
    const [{ count }] = await tx.unsafe(`select count(*)::int as count from ${quote(table)}`);
    if (count !== rows.length) throw new Error('Row count changed unexpectedly; transaction rolled back.');
  }
}

(async () => {
  try {
    await sql.begin('isolation level serializable', repair);
    console.log(process.argv.includes('--apply') ? 'Repair committed; existing rows preserved.' : 'Read only. Pass --apply to repair.');
  } catch (error) {
    console.error('Repair stopped; database transaction rolled back: ' + error.message);
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 1 });
  }
})();
