import { test, expect, request as plRequest } from "@playwright/test";
import { io as socketIO, type Socket } from "socket.io-client";
import { API_URL, apiSignUp, uniqueEmail, uniqueUsername } from "./helpers";

test("send message + recipient receives via socket + read receipts", async () => {
  const ctxA = await plRequest.newContext();
  const ctxB = await plRequest.newContext();

  const aEmail = uniqueEmail("alice_msg");
  const bEmail = uniqueEmail("bob_msg");
  await apiSignUp(ctxA, {
    email: aEmail,
    password: "Aa1!aaaaaa",
    name: "Alice",
    username: uniqueUsername("alm"),
  });
  await apiSignUp(ctxB, {
    email: bEmail,
    password: "Aa1!aaaaaa",
    name: "Bob",
    username: uniqueUsername("bom"),
  });

  // Need each user's id to chat
  const aMe = await (await ctxA.get(`${API_URL}/api/users/me`)).json();
  const bMe = await (await ctxB.get(`${API_URL}/api/users/me`)).json();

  // Alice opens a chat with Bob
  const chat = await (
    await ctxA.get(`${API_URL}/api/chats/with/${bMe.id}`)
  ).json();
  expect(chat.id).toBeTruthy();

  // Bob connects a socket to receive real-time events
  const bCookies = await ctxB.storageState();
  const cookieHeader = bCookies.cookies
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const bSocket: Socket = socketIO(API_URL, {
    transports: ["websocket"],
    extraHeaders: { cookie: cookieHeader },
  });
  bSocket.emit("chat:join", chat.id);

  const received = new Promise<any>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout waiting for message:new")), 8000);
    bSocket.on("message:new", (m: any) => {
      clearTimeout(t);
      resolve(m);
    });
  });

  // Alice sends a message
  const send = await ctxA.post(`${API_URL}/api/messages`, {
    data: { chatId: chat.id, text: "hello bob" },
  });
  expect(send.ok()).toBeTruthy();
  const msg = await send.json();

  const event = await received;
  expect(event.chatId).toBe(chat.id);
  expect(event.text).toBe("hello bob");

  // Bob marks the chat as read; Alice should see a message:read event
  const aCookies = await ctxA.storageState();
  const aCookieHeader = aCookies.cookies
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const aSocket: Socket = socketIO(API_URL, {
    transports: ["websocket"],
    extraHeaders: { cookie: aCookieHeader },
  });
  aSocket.emit("chat:join", chat.id);
  const readPromise = new Promise<any>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout waiting for message:read")), 8000);
    aSocket.on("message:read", (p: any) => {
      clearTimeout(t);
      resolve(p);
    });
  });

  await ctxB.post(`${API_URL}/api/chats/${chat.id}/read`);
  const readEvent = await readPromise;
  expect(readEvent.chatId).toBe(chat.id);
  expect(readEvent.ids).toContain(msg.id);

  bSocket.disconnect();
  aSocket.disconnect();
  await ctxA.dispose();
  await ctxB.dispose();
  void aMe;
});
