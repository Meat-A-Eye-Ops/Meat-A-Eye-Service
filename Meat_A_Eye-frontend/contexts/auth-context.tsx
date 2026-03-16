"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  getAuthToken,
  getAuthNickname,
  setAuthToken,
  setAuthNickname,
  removeAuthToken,
} from "@/lib/api";

interface AuthContextType {
  isAuthenticated: boolean;
  nickname: string | null;
  mustResetPassword: boolean;
  isLoading: boolean;
  login: (token: string, nickname: string, mustReset?: boolean) => void;
  clearMustResetPassword: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);
  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for existing auth token on mount
    const token = getAuthToken();
    const storedNickname = getAuthNickname();

    if (token) {
      setIsAuthenticated(true);
      setNickname(storedNickname);
      // localStorage에서 mustResetPassword 복원
      const storedMustReset = localStorage.getItem("must_reset_password");
      if (storedMustReset === "true") {
        setMustResetPassword(true);
      }
    }

    setIsLoading(false);
  }, []);

  const login = (token: string, nickname: string, mustReset?: boolean) => {
    setAuthToken(token);
    setAuthNickname(nickname);
    setIsAuthenticated(true);
    setNickname(nickname);
    if (mustReset) {
      setMustResetPassword(true);
      localStorage.setItem("must_reset_password", "true");
    }
  };

  const clearMustResetPassword = () => {
    setMustResetPassword(false);
    localStorage.removeItem("must_reset_password");
  };

  const logout = () => {
    removeAuthToken();
    localStorage.removeItem("must_reset_password");
    setIsAuthenticated(false);
    setNickname(null);
    setMustResetPassword(false);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        nickname,
        mustResetPassword,
        isLoading,
        login,
        clearMustResetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
