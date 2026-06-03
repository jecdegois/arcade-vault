'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { AVUser } from './data';

interface UserContextValue {
  user: AVUser | null;
  loading: boolean;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
});

async function fetchOrCreateProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  fallbackName: string
): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', userId)
    .single();

  if (data) return data.display_name;

  await supabase
    .from('profiles')
    .insert({ user_id: userId, display_name: fallbackName });

  return fallbackName;
}

/** Derivar AVUser solo de user_metadata — sin llamadas a la BD (seguro dentro de onAuthStateChange) */
function userFromSession(session: Session): AVUser {
  const meta = session.user.user_metadata ?? {};
  const name =
    meta.full_name ??
    meta.display_name ??
    session.user.email?.split('@')[0] ??
    'Usuario';
  const avatar = meta.avatar_url ?? meta.picture ?? null;
  return { id: session.user.id, name, avatar };
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AVUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      // ⚠️ NO async — llamar métodos de Supabase aquí provoca deadlock (bug conocido de supabase-js)
      (_event: AuthChangeEvent, session: Session | null) => {
        if (session) {
          const base = userFromSession(session);
          setUser(base); // síncrono → navbar se pinta inmediatamente
          setLoading(false);
          // Enriquecer con el display_name canónico de profiles FUERA del lock de auth
          setTimeout(() => {
            fetchOrCreateProfile(supabase, session.user.id, base.name)
              .then((name) =>
                setUser((prev) =>
                  prev && prev.id === session.user.id ? { ...prev, name } : prev
                )
              )
              .catch(() => {});
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
