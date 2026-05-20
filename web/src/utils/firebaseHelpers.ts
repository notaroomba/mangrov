// Kept the original filename to avoid touching unrelated imports.
// All functions now route through the Postgres API rather than Firestore.
import { api, ApiError } from "../lib/api";
import type { Post } from "./types";

export const checkUsernameExists = async (
  username: string,
  excludeUserId?: string
): Promise<boolean> => {
  try {
    const { available } = await api.get<{ available: boolean }>(
      `/api/users/check-username?u=${encodeURIComponent(username)}`
    );
    if (!available && excludeUserId) {
      // If the only match is the current user, treat as not-taken.
      const me = await api.get<{ id: string }>(`/api/users/me`).catch(() => null);
      if (me && me.id === excludeUserId) return false;
    }
    return !available;
  } catch (error) {
    console.error("Error checking username existence:", error);
    return false;
  }
};

type ServerUser = {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  country: string | null;
  language: string | null;
  interests?: string[];
  email?: string;
};

function toFirestoreShape(u: ServerUser) {
  return {
    uid: u.id,
    displayName: u.name ?? "",
    username: u.username ?? "",
    avatar: u.avatar ?? "",
    country: u.country ?? "",
    language: u.language ?? "",
    interests: u.interests ?? [],
    email: u.email,
  };
}

export const fetchUserData = async (userId: string) => {
  try {
    const u = await api.get<ServerUser>(`/api/users/${encodeURIComponent(userId)}`);
    return toFirestoreShape(u);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    console.error("Error fetching user data:", error);
    return null;
  }
};

export const fetchUserByUsername = async (username: string) => {
  // We expose lookup by id; for username we filter via a server-side scan.
  try {
    const u = await api
      .get<ServerUser>(`/api/users/by-username/${encodeURIComponent(username)}`)
      .catch(() => null);
    if (!u) return null;
    return toFirestoreShape(u);
  } catch (error) {
    console.error("Error fetching user by username:", error);
    return null;
  }
};

export const fetchUserTrades = async (userId: string): Promise<Post[]> => {
  try {
    const rows = await api.get<any[]>(
      `/api/trades?userId=${encodeURIComponent(userId)}`
    );
    return rows.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      images: t.images ?? [],
      keywords: t.keywords ?? [],
      niche: t.niche ? [t.niche] : [],
      likes: false,
      saves: false,
      business: "",
      comments: false,
      timestamp: t.createdAt,
      url: "",
      productIds: [],
      uid: t.userId,
      isAvailable: t.isAvailable,
    }));
  } catch (error) {
    console.error("Error fetching user trades:", error);
    return [];
  }
};

export const fetchSavedPosts = async (_userId: string) => {
  try {
    const rows = await api.get<any[]>(`/api/users/me/saves`);
    return rows.map((p) => ({ ...p, id: p.id }));
  } catch (error) {
    console.error("Error fetching saved posts:", error);
    return [];
  }
};
