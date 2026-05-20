import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:8080";

export function uniqueEmail(label = "user") {
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return `${label}_${stamp}@e2e.mangrov.test`;
}

export function uniqueUsername(label = "u") {
  return `${label}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export async function apiSignUp(
  req: APIRequestContext,
  fields: {
    email: string;
    password: string;
    name: string;
    username: string;
    country?: string;
    language?: string;
    interests?: string[];
  }
) {
  const res = await req.post(`${API_URL}/api/auth/sign-up/email`, {
    data: {
      email: fields.email,
      password: fields.password,
      name: fields.name,
      username: fields.username,
      country: fields.country ?? "United States",
      language: fields.language ?? "en",
      interests: fields.interests ?? ["tech"],
    },
    failOnStatusCode: false,
  });
  if (!res.ok()) {
    throw new Error(`sign-up failed (${res.status()}): ${await res.text()}`);
  }
  return res.json();
}

export async function apiSignIn(
  req: APIRequestContext,
  email: string,
  password: string
) {
  const res = await req.post(`${API_URL}/api/auth/sign-in/email`, {
    data: { email, password },
    failOnStatusCode: false,
  });
  if (!res.ok()) {
    throw new Error(`sign-in failed (${res.status()}): ${await res.text()}`);
  }
  return res.json();
}

export async function signUpViaUI(
  page: Page,
  fields: {
    email: string;
    password: string;
    name: string;
    username: string;
  }
) {
  await page.goto("/");
  await page.getByPlaceholder("you@example.com").fill(fields.email);
  await page.getByRole("button", { name: /create new account/i }).click();

  await page.getByPlaceholder("John Doe").fill(fields.name);
  await page.getByPlaceholder("johndoe123").fill(fields.username);

  // Pick a country and language via react-select
  await page.locator("text=Select country").click();
  await page.keyboard.type("United States");
  await page.keyboard.press("Enter");

  await page.locator("text=Select language").click();
  await page.keyboard.type("English");
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: /^continue$/i }).click();

  // Interests step — click first available interest card
  await page.locator("[class*=cursor-pointer]").first().click();
  await page.getByRole("button", { name: /^continue$/i }).click();

  // Password
  await page.getByPlaceholder("••••••••").fill(fields.password);
  await page.getByRole("button", { name: /^continue$/i }).click();

  await expect(page).toHaveURL(/\/dashboard/i, { timeout: 30_000 });
}

export async function loginContextWithFreshUser(
  context: BrowserContext,
  label = "user"
) {
  const email = uniqueEmail(label);
  const username = uniqueUsername(label);
  const password = "Aa1!aaaaaa";
  await apiSignUp(context.request, {
    email,
    password,
    name: `${label} ${username}`,
    username,
  });
  // Sign in to get the session cookie attached to context
  await apiSignIn(context.request, email, password);
  return { email, username, password };
}
