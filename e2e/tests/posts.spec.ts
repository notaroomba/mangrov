import { test, expect } from "@playwright/test";
import { API_URL, apiSignUp, uniqueEmail, uniqueUsername } from "./helpers";

test("create + list + like post", async ({ request }) => {
  const email = uniqueEmail("poster");
  const username = uniqueUsername("p");
  const password = "Aa1!aaaaaa";
  await apiSignUp(request, {
    email,
    password,
    name: "Poster",
    username,
  });

  const post = await request.post(`${API_URL}/api/posts`, {
    data: {
      title: "Test Item",
      description: "An e2e item",
      images: ["https://placehold.co/600x400.png"],
      keywords: ["e2e"],
      niche: ["tech"],
      price: 9.99,
      quantity: 1,
      isAvailable: true,
    },
  });
  expect(post.ok()).toBeTruthy();
  const created = await post.json();
  expect(created.id).toBeTruthy();
  expect(created.title).toBe("Test Item");

  const list = await request.get(`${API_URL}/api/posts?limit=10`);
  expect(list.ok()).toBeTruthy();
  const rows = await list.json();
  expect(rows.find((r: any) => r.id === created.id)).toBeTruthy();

  const like = await request.post(`${API_URL}/api/posts/${created.id}/like`);
  expect(like.ok()).toBeTruthy();

  const likes = await request.get(`${API_URL}/api/posts/${created.id}/likes`);
  const likesBody = await likes.json();
  expect(likesBody.count).toBeGreaterThan(0);

  const unlike = await request.delete(`${API_URL}/api/posts/${created.id}/like`);
  expect(unlike.ok()).toBeTruthy();
});
