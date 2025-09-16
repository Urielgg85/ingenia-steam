import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const SessionCtx = createContext(null);
export function useSession() { return useContext(SessionCtx); }

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, sess) => {
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      if (!session) { setProfile(null); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      setProfile(data || null);
    }
    fetchProfile();
  }, [session]);

  return <SessionCtx.Provider value={{ session, profile, loading }}>{children}</SessionCtx.Provider>;
}
