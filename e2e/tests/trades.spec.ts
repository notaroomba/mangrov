import { test, expect, request as plRequest } from "@playwright/test";
import { API_URL, apiSignUp, uniqueEmail, uniqueUsername } from "./helpers";

test("mutual swipe-like creates a match", async ({ browser }) => {
  // Two isolated request contexts so each user has its own cookie jar.
  const ctxA = await plRequest.newContext();
  const ctxB = await plRequest.newContext();

  const aEmail = uniqueEmail("alice");
  const bEmail = uniqueEmail("bob");
  const aUser = uniqueUsername("alice");
  const bUser = uniqueUsername("bob");

  await apiSignUp(ctxA, {
    email: aEmail,
    password: "Aa1!aaaaaa",
    name: "Alice",
    username: aUser,
  });
  await apiSignUp(ctxB, {
    email: bEmail,
    password: "Aa1!aaaaaa",
    name: "Bob",
    username: bUser,
  });

  const aTrade = await (
    await ctxA.post(`${API_URL}/api/trades`, {
      data: {
        title: "Alice's apple",
        description: "fresh",
        images: ["https://placehold.co/400x400.png"],
        niche: "produce",
        quantity: 1,
      },
    })
  ).json();
  const bTrade = await (
    await ctxB.post(`${API_URL}/api/trades`, {
      data: {
        title: "Bob's banana",
        description: "ripe",
        images: ["https://placehold.co/400x400.png"],
        niche: "produce",
        quantity: 1,
      },
    })
  ).json();
  expect(aTrade.id).toBeTruthy();
  expect(bTrade.id).toBeTruthy();

  // Alice likes Bob's trade
  const aLike = await ctxA.post(`${API_URL}/api/trades/${bTrade.id}/swipe`, {
    data: { decision: "like" },
  });
  expect(aLike.ok()).toBeTruthy();
  const aLikeBody = await aLike.json();
  expect(aLikeBody.matched).toBe(false);

  // Bob likes Alice's trade
  const bLike = await ctxB.post(`${API_URL}/api/trades/${aTrade.id}/swipe`, {
    data: { decision: "like" },
  });
  expect(bLike.ok()).toBeTruthy();
  const bLikeBody = await bLike.json();
  expect(bLikeBody.matched).toBe(true);

  // Both should see the match in /api/matches
  const aMatches = await (await ctxA.get(`${API_URL}/api/matches`)).json();
  const bMatches = await (await ctxB.get(`${API_URL}/api/matches`)).json();
  expect(aMatches.length).toBeGreaterThan(0);
  expect(bMatches.length).toBeGreaterThan(0);

  await ctxA.dispose();
  await ctxB.dispose();
  // unused import suppression
  void browser;
});
