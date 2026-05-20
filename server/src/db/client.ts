import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

const url =
  process.env.DATABASE_URL ?? "postgres://mangrov:mangrov@localhost:5432/mangrov";

export const sql = postgres(url, {
  max: 10,
  prepare: false,
});

export const db = drizzle(sql, { schema });

export type DB = typeof db;
