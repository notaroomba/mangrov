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
    transports: ["polling", "websocket"],
    extraHeaders: { cookie: cookieHeader },
    withCredentials: true,
  });

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error("timeout connecting socket B: " + (bSocket as any).io?.engine?.transport?.name)),
      10000
    );
    bSocket.once("connect", () => {
      clearTimeout(t);
      resolve();
    });
    bSocket.once("connect_error", (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
  bSocket.emit("chat:join", chat.id);

  const received = new Promise<any>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout waiting for message:new")), 15000);
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
    transports: ["polling", "websocket"],
    extraHeaders: { cookie: aCookieHeader },
    withCredentials: true,
  });
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout connecting socket A")), 10000);
    aSocket.once("connect", () => {
      clearTimeout(t);
      resolve();
    });
    aSocket.once("connect_error", (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
  aSocket.emit("chat:join", chat.id);
  const readPromise = new Promise<any>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout waiting for message:read")), 15000);
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
