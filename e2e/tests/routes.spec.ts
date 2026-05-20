import { test, expect } from "@playwright/test";
import { API_URL, apiSignUp, uniqueEmail, uniqueUsername } from "./helpers";

/**
 * Endpoint-existence guard. Every URL listed here is something the web SPA
 * calls. If the corresponding server route disappears or is renamed, the
 * browser-side error becomes a hard test failure here — well before a user
 * sees it.
 *
 * We don't assert response shape (those are covered by the feature tests);
 * we assert the server doesn't 404 / 405. Anything in [200, 499] except
 * those two means the route at least matched.
 */
test("every frontend-called endpoint resolves on the server", async ({ request }) => {
  const email = uniqueEmail("routes");
  const username = uniqueUsername("rt");
  const password = "Aa1!aaaaaa";
  await apiSignUp(request, { email, password, name: "Routes Test", username });
  const me = await (await request.get(`${API_URL}/api/users/me`)).json();

  // Create a post and a trade so the per-id endpoints have something to hit.
  const post = await (
    await request.post(`${API_URL}/api/posts`, {
      data: {
        title: "endpoint-check post",
        description: "x",
        images: ["https://placehold.co/200x200.png"],
      },
    })
  ).json();
  const trade = await (
    await request.post(`${API_URL}/api/trades`, {
      data: {
        title: "endpoint-check trade",
        description: "x",
        images: ["https://placehold.co/200x200.png"],
      },
    })
  ).json();

  // Need a second user to open a chat with.
  const other = await apiSignUp(await test.request.newContext(), {
    email: uniqueEmail("rt2"),
    password,
    name: "Other",
    username: uniqueUsername("rt2"),
  });
  const chat = await (
    await request.get(`${API_URL}/api/chats/with/${other.user.id}`)
  ).json();

  const checks: Array<{ method: "GET" | "POST" | "PATCH" | "DELETE"; path: string; body?: any }> = [
    // Users
    { method: "GET", path: `/api/users/me` },
    { method: "PATCH", path: `/api/users/me`, body: {} },
    { method: "GET", path: `/api/users/check-username?u=${username}` },
    { method: "GET", path: `/api/users/by-username/${username}` },
    { method: "GET", path: `/api/users/${me.id}` },

    // Posts
    { method: "GET", path: `/api/posts` },
    { method: "GET", path: `/api/posts?limit=5&niche=tech` },
    { method: "GET", path: `/api/posts/${post.id}` },
    { method: "GET", path: `/api/posts/${post.id}/likes` },
    { method: "GET", path: `/api/posts/${post.id}/comments` },
    { method: "POST", path: `/api/posts/${post.id}/like` },
    { method: "DELETE", path: `/api/posts/${post.id}/like` },
    { method: "POST", path: `/api/posts/${post.id}/save` },
    { method: "DELETE", path: `/api/posts/${post.id}/save` },
    { method: "POST", path: `/api/posts/${post.id}/comments`, body: { text: "hi" } },
    { method: "GET", path: `/api/users/me/saves` },

    // Trades & matches
    { method: "GET", path: `/api/trades` },
    { method: "GET", path: `/api/trades?userId=me&excludeOwn=true&excludeSwiped=true` },
    { method: "GET", path: `/api/trades/${trade.id}` },
    { method: "PATCH", path: `/api/trades/${trade.id}`, body: {} },
    { method: "GET", path: `/api/matches` },

    // Chats / messaging
    { method: "GET", path: `/api/chats` },
    { method: "GET", path: `/api/chats/with/${other.user.id}` },
    { method: "GET", path: `/api/chats/${chat.id}/messages` },
    { method: "POST", path: `/api/chats/${chat.id}/read` },
    { method: "POST", path: `/api/messages`, body: { chatId: chat.id, text: "hi" } },

    // Uploads
    {
      method: "POST",
      path: `/api/uploads/presign`,
      body: { kind: "post", contentType: "image/png" },
    },

    // Better Auth — verify the catch-all router mounts.
    { method: "GET", path: `/api/auth/get-session` },
  ];

  const failures: Array<{ method: string; path: string; status: number; body: string }> = [];
  for (const c of checks) {
    const init: any = { failOnStatusCode: false };
    if (c.body !== undefined) init.data = c.body;
    const res = await request.fetch(`${API_URL}${c.path}`, {
      method: c.method,
      ...init,
    });
    if (res.status() === 404 || res.status() === 405) {
      failures.push({
        method: c.method,
        path: c.path,
        status: res.status(),
        body: (await res.text()).slice(0, 200),
      });
    }
  }

  expect.soft(failures, "Endpoints that 404/405 — frontend will break in browser").toEqual([]);
});
