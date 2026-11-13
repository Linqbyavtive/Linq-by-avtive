"use client";

import { createClient as createSupabaseBrowserClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

export const supabase = createSupabaseBrowserClient();

export const authClient = {
  signIn: {
    email: async ({ email, password }: { email: string; password: string }) => {
      const res = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (res.error) {
        return {
          data: null,
          error: {
            message: res.error.message,
            code: (res.error as unknown as { code?: string }).code,
            status: res.error.status,
          },
        };
      }
      return {
        data: {
          user: res.data.user,
          session: res.data.session,
        },
        error: null,
      };
    },
  },
  signUp: {
    email: async ({
      email,
      password,
      name,
      options,
    }: {
      email: string;
      password: string;
      name?: string;
      options?: { data?: Record<string, unknown> };
    }) => {
      const res = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name,
            ...options?.data,
          },
        },
      });
      if (res.error) {
        return {
          data: null,
          error: {
            message: res.error.message,
            code: (res.error as unknown as { code?: string }).code,
            status: res.error.status,
          },
        };
      }
      return {
        data: {
          user: res.data.user,
          session: res.data.session,
        },
        error: null,
      };
    },
  },
  signOut: async () => {
    const res = await supabase.auth.signOut();
    return { error: res.error ? { message: res.error.message } : null };
  },
  useSession: () => {
    const [session, setSession] = useState<{ user?: { id?: string; email?: string } } | null>(null);
    const [isPending, setIsPending] = useState(true);

    useEffect(() => {
      let mounted = true;
      supabase.auth.getSession().then(({ data }) => {
        if (!mounted) return;
        if (data?.session?.user) {
          setSession({
            user: {
              id: data.session.user.id,
              email: data.session.user.email,
            },
          });
        } else {
          setSession(null);
        }
        setIsPending(false);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
        if (!mounted) return;
        if (currentSession?.user) {
          setSession({
            user: {
              id: currentSession.user.id,
              email: currentSession.user.email,
            },
          });
        } else {
          setSession(null);
        }
        setIsPending(false);
      });

      return () => {
        mounted = false;
        authListener?.subscription?.unsubscribe();
      };
    }, []);

    return { data: session, isPending };
  },
};
