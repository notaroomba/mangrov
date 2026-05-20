import postgres from "postgres";

const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const sql = postgres(url, { max: 1, prepare: false });

const all = await sql`SELECT count(*)::int AS c FROM "user"`;
const e2e = await sql`
  SELECT count(*)::int AS c FROM "user"
  WHERE email ILIKE '%@e2e.mangrov.test'
     OR email ILIKE 'smoketest_%@example.test'
     OR email ILIKE 'ratelimittest_%@e.test'
`;
const realPosts = await sql`
  SELECT count(*)::int AS c FROM posts
  WHERE user_id NOT IN (
    SELECT id FROM "user"
    WHERE email ILIKE '%@e2e.mangrov.test'
       OR email ILIKE 'smoketest_%@example.test'
       OR email ILIKE 'ratelimittest_%@e.test'
  )
`;
const realTrades = await sql`
  SELECT count(*)::int AS c FROM trades
  WHERE user_id NOT IN (
    SELECT id FROM "user"
    WHERE email ILIKE '%@e2e.mangrov.test'
       OR email ILIKE 'smoketest_%@example.test'
       OR email ILIKE 'ratelimittest_%@e.test'
  )
`;
console.log("total users:", all[0].c);
console.log("e2e users  :", e2e[0].c);
console.log("real users :", all[0].c - e2e[0].c);
console.log("real posts (kept) :", realPosts[0].c);
console.log("real trades (kept):", realTrades[0].c);
await sql.end({ timeout: 1 });
