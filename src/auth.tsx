import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  displayName: string | null;  // Vezetéknév Keresztnév (magyar sorrend)
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
  updateProfile: (firstName: string, lastName: string) => Promise<{ error: string | null }>;
  uploadAvatar: (file: File) => Promise<{ url: string | null; error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // kezdeti auth state lekérdezés
  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      setLoading(true);
      const { data, error } = await supabase.auth.getUser();
      if (isMounted) {
        if (error) {
          console.warn("Auth getUser error:", error.message);
          setUser(null);
        } else {
          setUser(data.user ?? null);
        }
        setLoading(false);
      }
    }

    loadUser();

    // állapotváltozás figyelése (login / logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error ? error.message : null };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    return { error: error ? error.message : null };
  }

  async function updateProfile(firstName: string, lastName: string) {
    const { error } = await supabase.auth.updateUser({
      data: { first_name: firstName, last_name: lastName },
    });
    if (!error) {
      // Frissítjük a helyi user state-et
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
    }
    return { error: error ? error.message : null };
  }

  async function uploadAvatar(file: File) {
    if (!user) return { url: null, error: "Nincs bejelentkezett felhasználó." };
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (upErr) return { url: null, error: upErr.message };
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;
    const { error: metaErr } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
    if (!metaErr) {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
    }
    return { url: avatarUrl, error: metaErr ? metaErr.message : null };
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    // Jelenlegi jelszó ellenőrzése re-autentikációval
    if (!user?.email) return { error: "Nem sikerült azonosítani a felhasználót." };
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInErr) return { error: "A jelenlegi jelszó helytelen." };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error ? error.message : null };
  }

  // Magyar névsor: Vezetéknév Keresztnév
  const firstName = (user?.user_metadata?.first_name as string | undefined) ?? null;
  const lastName  = (user?.user_metadata?.last_name  as string | undefined) ?? null;
  const displayName = (firstName || lastName)
    ? [lastName, firstName].filter(Boolean).join(" ")
    : null;
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? null;

  const value: AuthContextValue = {
    user,
    loading,
    displayName,
    firstName,
    lastName,
    avatarUrl,
    signUp,
    signIn,
    signOut,
    resetPassword,
    changePassword,
    updateProfile,
    uploadAvatar,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth csak AuthProvider-en belül használható");
  }
  return ctx;
}
