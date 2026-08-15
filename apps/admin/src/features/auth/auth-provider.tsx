'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  login,
  logout,
  register,
  restoreSession,
} from '../../lib/api';
import type {
  AuthenticatedUser,
  LoginInput,
  RegisterInput,
} from '../../lib/types';

interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  loginUser: (input: LoginInput) => Promise<void>;
  registerUser: (
    input: RegisterInput,
  ) => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<
  AuthContextValue | undefined
>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] =
    useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function initializeSession() {
      try {
        const session = await restoreSession();

        if (active) {
          setUser(session?.user ?? null);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initializeSession();

    return () => {
      active = false;
    };
  }, []);

  const loginUser = useCallback(
    async (input: LoginInput) => {
      const session = await login(input);
      setUser(session.user);
    },
    [],
  );

  const registerUser = useCallback(
    async (input: RegisterInput) => {
      await register(input);

      const session = await login({
        email: input.email,
        password: input.password,
      });

      setUser(session.user);
    },
    [],
  );

  const logoutUser = useCallback(async () => {
    try {
      await logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      loginUser,
      registerUser,
      logoutUser,
    }),
    [
      user,
      loading,
      loginUser,
      registerUser,
      logoutUser,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider.',
    );
  }

  return context;
}