'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { AVUser } from './data';

interface UserContextValue {
  user: AVUser | null;
  setUser: (user: AVUser | null) => void;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  setUser: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AVUser | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('av_user');
      if (stored) setUserState(JSON.parse(stored));
    } catch {}
  }, []);

  const setUser = (u: AVUser | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem('av_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('av_user');
    }
  };

  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
