import { createContext, useContext, type ReactNode } from "react";
import { authClient, useSession, signOut as authSignOut } from "../lib/auth-client";

export type AppUser = {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  name: string | null;
  photoURL: string | null;
  avatar: string | null;
  username: string | null;
  country: string | null;
  language: string | null;
  interests: string[];
  emailVerified: boolean;
};

type AuthState = {
  isSignedIn: boolean;
  pending: boolean;
  user: AppUser | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

function mapUser(raw: any | null | undefined): AppUser | null {
  if (!raw) return null;
  const avatar = raw.avatar ?? raw.image ?? null;
  return {
    uid: raw.id,
    id: raw.id,
    email: raw.email ?? null,
    displayName: raw.name ?? null,
    name: raw.name ?? null,
    photoURL: avatar,
    avatar,
    username: raw.username ?? null,
    country: raw.country ?? null,
    language: raw.language ?? null,
    interests: Array.isArray(raw.interests) ? raw.interests : [],
    emailVerified: !!raw.emailVerified,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending, refetch } = useSession();
  const user = mapUser(data?.user);

  const value: AuthState = {
    isSignedIn: !!user,
    pending: isPending,
    user,
    signOut: async () => {
      try {
        await authSignOut();
        await refetch?.();
      } catch (error) {
        console.error("Error signing out:", error);
      }
    },
    refresh: async () => {
      await refetch?.();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { authClient };
