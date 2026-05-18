import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type User = {
  id: number;
  profile_image?: string | null;
  name: string;
  email: string;
  role: "admin" | "warden";
  branch_id: number | null;
  branch_name?: string | null;
};

type StoredSession = {
  user: User;
  expiresAt: number;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "raqib_core_session";

/**
 * Change this value depending on what you want:
 * 1 minute  = 1 * 60 * 1000
 * 30 minutes = 30 * 60 * 1000
 * 1 hour = 60 * 60 * 1000
 */
const SESSION_DURATION_MS = 30 * 60 * 1000; 

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStoredSession = async () => {
    try {
      const storedSession = await AsyncStorage.getItem(STORAGE_KEY);

      if (!storedSession) {
        setUser(null);
        return;
      }

      const parsed: StoredSession = JSON.parse(storedSession);

      if (!parsed?.user || !parsed?.expiresAt) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setUser(null);
        return;
      }

      const now = Date.now();

      if (now >= parsed.expiresAt) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setUser(null);
        return;
      }

      setUser(parsed.user);
    } catch (error) {
      console.error("Failed to load stored session:", error);
      await AsyncStorage.removeItem(STORAGE_KEY);
      setUser(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await loadStoredSession();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const signIn = async (nextUser: User) => {
    try {
      const session: StoredSession = {
        user: nextUser,
        expiresAt: Date.now() + SESSION_DURATION_MS,
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setUser(nextUser);
    } catch (error) {
      console.error("Failed to save session:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setUser(null);
    } catch (error) {
      console.error("Failed to clear session:", error);
      throw error;
    }
  };

  const refreshSession = async () => {
    try {
      const storedSession = await AsyncStorage.getItem(STORAGE_KEY);

      if (!storedSession) return;

      const parsed: StoredSession = JSON.parse(storedSession);

      if (!parsed?.user) return;

      const refreshedSession: StoredSession = {
        user: parsed.user,
        expiresAt: Date.now() + SESSION_DURATION_MS,
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(refreshedSession));
    } catch (error) {
      console.error("Failed to refresh session:", error);
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signOut,
      refreshSession,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}