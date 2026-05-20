import { test, expect } from "@playwright/test";
import {
  API_URL,
  uniqueEmail,
  uniqueUsername,
  apiSignUp,
  apiSignIn,
} from "./helpers";

test.describe("auth", () => {
  test("sign up via API and reach /api/users/me", async ({ request }) => {
    const email = uniqueEmail("signup");
    const username = uniqueUsername("u");
    const password = "Aa1!aaaaaa";

    await apiSignUp(request, {
      email,
      password,
      name: "Signup User",
      username,
    });

    const me = await request.get(`${API_URL}/api/users/me`);
    expect(me.ok()).toBeTruthy();
    const body = await me.json();
    expect(body.email).toBe(email);
    expect(body.username).toBe(username);
  });

  test("sign in with wrong password is rejected", async ({ request }) => {
    const email = uniqueEmail("wrongpw");
    const password = "Aa1!aaaaaa";
    await apiSignUp(request, {
      email,
      password,
      name: "Wrong PW",
      username: uniqueUsername("wp"),
    });

    const res = await request.post(`${API_URL}/api/auth/sign-in/email`, {
      data: { email, password: "Bb2@bbbbbb" },
      failOnStatusCode: false,
    });
    expect(res.ok()).toBeFalsy();
  });

  test("sign up + sign in via UI and land on dashboard", async ({ page }) => {
    const email = uniqueEmail("ui");
    const username = uniqueUsername("ui");
    const password = "Aa1!aaaaaa";

    // Use API for sign-up so we don't depend on react-select UI specifics
    await apiSignUp(page.request, {
      email,
      password,
      name: "UI Tester",
      username,
    });

    await page.goto("/");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.getByPlaceholder("••••••••").fill(password);
    await page.getByRole("button", { name: /^continue$/i }).click();

    await expect(page).toHaveURL(/\/dashboard/i, { timeout: 30_000 });
  });

  test("session survives reload", async ({ page, request }) => {
    const email = uniqueEmail("reload");
    const username = uniqueUsername("rl");
    const password = "Aa1!aaaaaa";
    await apiSignUp(request, {
      email,
      password,
      name: "Reload User",
      username,
    });
    await apiSignIn(page.request, email, password);

    await page.goto("/dashboard");
    await page.reload();
    await expect(page).not.toHaveURL(/^http[^/]+\/$/);
  });
});
