import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

const baseURL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ||
  "http://localhost:8080";

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: { credentials: "include" },
  plugins: [
    inferAdditionalFields({
      user: {
        username: { type: "string", required: false },
        country: { type: "string", required: false },
        language: { type: "string", required: false },
        interests: { type: "string[]", required: false },
        avatar: { type: "string", required: false },
      },
    }),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  updateUser,
} = authClient;

// Better Auth client surface varies across versions; these helpers thunk to whatever
// method or REST endpoint is actually available at runtime.
type AnyClient = Record<string, any>;

export async function forgetPassword(params: {
  email: string;
  redirectTo?: string;
}) {
  const c = authClient as AnyClient;
  if (typeof c.forgetPassword === "function") return c.forgetPassword(params);
  if (typeof c.requestPasswordReset === "function") return c.requestPasswordReset(params);
  const baseURL =
    (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ||
    "http://localhost:8080";
  const res = await fetch(`${baseURL}/api/auth/forget-password`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    return { data: null, error: { message: `HTTP ${res.status}` } };
  }
  return { data: await res.json().catch(() => ({})), error: null };
}

export async function resetPassword(params: {
  newPassword: string;
  token: string;
}) {
  const c = authClient as AnyClient;
  if (typeof c.resetPassword === "function") return c.resetPassword(params);
  const baseURL =
    (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ||
    "http://localhost:8080";
  const res = await fetch(`${baseURL}/api/auth/reset-password`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    return { data: null, error: { message: `HTTP ${res.status}` } };
  }
  return { data: await res.json().catch(() => ({})), error: null };
}

export async function verifyEmail(params: { query: { token: string } }) {
  const c = authClient as AnyClient;
  if (typeof c.verifyEmail === "function") return c.verifyEmail(params);
  const baseURL =
    (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ||
    "http://localhost:8080";
  const res = await fetch(
    `${baseURL}/api/auth/verify-email?token=${encodeURIComponent(params.query.token)}`,
    { credentials: "include" }
  );
  if (!res.ok) {
    return { data: null, error: { message: `HTTP ${res.status}` } };
  }
  return { data: await res.json().catch(() => ({})), error: null };
}

export async function sendVerificationEmail(params: { email: string }) {
  const c = authClient as AnyClient;
  if (typeof c.sendVerificationEmail === "function") return c.sendVerificationEmail(params);
  const baseURL =
    (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ||
    "http://localhost:8080";
  const res = await fetch(`${baseURL}/api/auth/send-verification-email`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    return { data: null, error: { message: `HTTP ${res.status}` } };
  }
  return { data: await res.json().catch(() => ({})), error: null };
}
