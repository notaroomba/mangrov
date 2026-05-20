import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  const url =
    process.env.DATABASE_URL ?? "postgres://mangrov:mangrov@localhost:5432/mangrov";
  const sql = postgres(url, { max: 1, prepare: false });
  const db = drizzle(sql);
  console.log("[migrate] running migrations against", url.replace(/:[^:@]+@/, ":****@"));
  await migrate(db, { migrationsFolder: "./migrations" });
  console.log("[migrate] done");
  await sql.end({ timeout: 1 });
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
