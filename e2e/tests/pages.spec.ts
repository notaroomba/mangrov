import { test, expect, type ConsoleMessage } from "@playwright/test";
import { API_URL, apiSignUp, uniqueEmail, uniqueUsername } from "./helpers";

/**
 * Page-load smoke tests. Each authenticated route is visited in a real
 * browser, and we fail if:
 *   - the page throws an uncaught JS error
 *   - the browser console logs any "Error" (matching anti-Firebase regressions
 *     like the Profile page calling a non-existent endpoint)
 *   - the URL gets bounced to /error
 *
 * This is the kind of safety net that would have caught the
 * "fetchUserByUsername → 404 → redirect to /error" bug.
 */
test.describe("authenticated page smoke", () => {
  test.beforeEach(async ({ context, request }) => {
    // Sign up + sign in once per test for context isolation
    const email = uniqueEmail("pg");
    const username = uniqueUsername("pg");
    await apiSignUp(request, { email, password: "Aa1!aaaaaa", name: "Page Smoke", username });
    // Transfer session cookie from APIRequestContext into the browser context
    const state = await request.storageState();
    await context.addCookies(state.cookies as any);
  });

  const cases: Array<{ name: string; path: string }> = [
    { name: "dashboard", path: "/dashboard" },
    { name: "search", path: "/search" },
    { name: "trade", path: "/trade" },
    { name: "messages", path: "/messages" },
    { name: "own profile (/user)", path: "/user" },
    { name: "add", path: "/add" },
  ];

  for (const { name, path } of cases) {
    test(`${name} loads without console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("console", (msg: ConsoleMessage) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => pageErrors.push(err.message));

      await page.goto(path, { waitUntil: "domcontentloaded" });

      // Give the SPA a beat to finish API calls and rendering
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

      expect.soft(pageErrors, `Uncaught errors on ${path}`).toEqual([]);

      // Filter out unrelated noise (Cloudflare Insights, etc.)
      const appErrors = consoleErrors.filter(
        (e) =>
          !/cloudflareinsights|beacon\.min\.js|integrity attribute/i.test(e) &&
          !/Failed to load resource: the server responded with a status of 4\d{2}.*placehold/i.test(e)
      );
      expect.soft(appErrors, `Console errors on ${path}`).toEqual([]);

      // /error route means something fatal happened during data load
      expect.soft(page.url(), `${path} got bounced to /error`).not.toMatch(/\/error$/);
    });
  }
});
