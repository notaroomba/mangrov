import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/client.js";
import * as schema from "./db/schema.js";

const trustedOrigins =
  (process.env.TRUSTED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

export const auth = betterAuth({
  appName: "mangrov",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:8080",
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      // In dev we just log; in prod, wire to an email provider (Resend/Postmark)
      console.log(`[auth] password reset link for ${user.email}: ${url}`);
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      console.log(`[auth] email verification link for ${user.email}: ${url}`);
    },
  },

  user: {
    additionalFields: {
      username: { type: "string", required: false, input: true },
      country: { type: "string", required: false, input: true },
      language: { type: "string", required: false, input: true },
      interests: { type: "string[]", required: false, input: true },
      avatar: { type: "string", required: false, input: true },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30d
    updateAge: 60 * 60 * 24, // 1d
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  advanced: {
    crossSubDomainCookies: cookieDomain
      ? { enabled: true, domain: cookieDomain }
      : { enabled: false },
    defaultCookieAttributes: {
      sameSite: cookieDomain ? "lax" : "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  },

  trustedOrigins,
});

export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;
