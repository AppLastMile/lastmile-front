import type { PropsWithChildren } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';

import {
  type MockUser,
  validateMockCredentials,
} from '@/modules/auth/constants/mockUsers';

type AuthSessionContextValue = {
  currentUser: MockUser | null;
  login: (email: string, password: string) => MockUser | null;
  logout: () => void;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      currentUser,
      login(email: string, password: string) {
        const matched = validateMockCredentials(email, password);

        if (matched) {
          setCurrentUser(matched);
        }

        return matched ?? null;
      },
      logout() {
        setCurrentUser(null);
      },
    }),
    [currentUser]
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error('useAuthSession must be used inside AuthSessionProvider');
  }

  return context;
}