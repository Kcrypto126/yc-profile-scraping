"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthContextProps } from "@/types";

export const Context = createContext<AuthContextProps>({
  isLoading: false,
  isAuthenticated: false,
  user: null,
  refresh: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthContextProps["user"]>(null);

  const router = useRouter();

  const refresh = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/me", { method: "GET" });
      if (!res.ok) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }
      const data = (await res.json()) as {
        ok: boolean;
        user?: { id?: string; email: string; name?: string | null; role?: string };
      };
      if (data.ok && data.user) {
        setIsAuthenticated(true);
        setUser({
          ...data.user,
          role: data.user.role === "admin" ? "admin" : "user",
        });
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
    setUser(null);
    router.push("/signin");
  };

  useEffect(() => {
    void refresh();
  }, []);
  
  return (
    <Context.Provider value={{ isLoading, isAuthenticated, user, refresh, signOut }}>
      {children}
    </Context.Provider>
  );
};

export const useAuth = (): AuthContextProps => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
