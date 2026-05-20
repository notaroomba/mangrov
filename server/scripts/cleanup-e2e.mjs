#!/usr/bin/env node
// One-off cleanup. Removes test users from the e2e suite and any content
// they created. CASCADE on user.id handles posts, trades, swipes, matches,
// chats, messages, sessions, accounts.
//
// Run with:
//   cd server
//   railway run --service Postgres-7FyK -- node scripts/cleanup-e2e.mjs --apply
//
// Without --apply, prints what *would* be deleted (dry-run).

import postgres from "postgres";

const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: no DATABASE_URL or DATABASE_PUBLIC_URL in env");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");

// Patterns the e2e helpers and my manual smoke tests use.
const EMAIL_PATTERNS = [
  "%@e2e.mangrov.test", // tests/helpers.ts uniqueEmail()
  "smoketest_%@example.test", // manual curl signup after first deploy
  "ratelimittest_%@e.test", // rate-limit verification curl
];

const sql = postgres(url, { max: 2, prepare: false });
try {
  const rows = await sql`
    SELECT id, email, username
    FROM "user"
    WHERE email ILIKE '%@e2e.mangrov.test'
       OR email ILIKE 'smoketest_%@example.test'
       OR email ILIKE 'ratelimittest_%@e.test'
    ORDER BY created_at
  `;
  void EMAIL_PATTERNS;

  console.log(`Found ${rows.length} test user(s):`);
  for (const r of rows) console.log(`  ${r.email}  (${r.username ?? "no-username"})`);

  if (rows.length === 0) {
    console.log("Nothing to do.");
    await sql.end({ timeout: 1 });
    process.exit(0);
  }

  const ids = rows.map((r) => r.id);
  const [{ postCount }] = await sql`
    SELECT count(*)::int AS "postCount" FROM posts WHERE user_id = ANY(${ids})
  `;
  const [{ tradeCount }] = await sql`
    SELECT count(*)::int AS "tradeCount" FROM trades WHERE user_id = ANY(${ids})
  `;
  const [{ messageCount }] = await sql`
    SELECT count(*)::int AS "messageCount" FROM messages WHERE sender_id = ANY(${ids})
  `;
  console.log(`\nCascade impact: ${postCount} posts, ${tradeCount} trades, ${messageCount} messages.`);

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to actually delete.");
    await sql.end({ timeout: 1 });
    process.exit(0);
  }

  const deleted = await sql`
    DELETE FROM "user" WHERE id = ANY(${ids}) RETURNING id
  `;
  console.log(`\nDeleted ${deleted.length} user(s) and all cascaded content.`);
  await sql.end({ timeout: 1 });
} catch (err) {
  console.error("Cleanup failed:", err);
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
}
