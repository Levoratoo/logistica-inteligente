"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  clearSession,
  demoCredentials,
  persistSession,
  readSession,
  type SessionUser,
} from "@/lib/auth";

type AuthContextValue = {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(readSession());
    setIsLoading(false);
  }, []);

  async function login(email: string, password: string) {
    if (
      email.trim().toLowerCase() !== demoCredentials.email ||
      password !== demoCredentials.password
    ) {
      throw new Error("Credenciais invalidas. Use o acesso de demonstracao.");
    }

    const nextUser = {
      email: demoCredentials.email,
      name: "Pedro Operacoes",
      role: "Logistics Manager",
    } satisfies SessionUser;

    persistSession(nextUser);
    setUser(nextUser);
  }

  function logout() {
    clearSession();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
