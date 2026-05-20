// Firebase has been removed from the web app. This file remains as a sentinel
// so that any straggling import surfaces a clear error rather than a silent
// runtime failure. The Flutter app in /app still uses Firebase directly.

const stub: unknown = new Proxy(
  {},
  {
    get() {
      throw new Error(
        "Firebase has been removed from the web app. Use ../lib/api, ../lib/auth-client, or ../lib/socket instead."
      );
    },
  }
);

export const app = stub as never;
export const auth = stub as never;
export const db = stub as never;
export const storage = stub as never;
