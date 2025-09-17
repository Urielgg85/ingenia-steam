// src/lib/session.jsx
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabase";

const SessionCtx = createContext(null);
export function useSession() { return useContext(SessionCtx); }

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const inflight = useRef(false);     // evita loadProfile simultáneos
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const loadProfile = useCallback(async (sess) => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const s = sess ?? session;
      if (!s) { if (mounted.current) setProfile(null); return; }

      // buscar perfil
      const { data, error } = await supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle();
      if (error) { console.warn("[profiles] select error:", error); if (mounted.current) setProfile(null); return; }

      if (data) {
        // completar email/nombre si faltan (una sola actualización)
        if ((!data.email || !data.display_name) && s.user?.email) {
          const patch = {
            ...(data.email ? {} : { email: s.user.email }),
            ...(data.display_name ? {} : { display_name: s.user.user_metadata?.name || s.user.email }),
          };
          if (Object.keys(patch).length) {
            await supabase.from("profiles").update(patch).eq("id", s.user.id);
            if (mounted.current) setProfile({ ...data, ...patch });
            return;
          }
        }
        if (mounted.current) setProfile(data);
        return;
      }

      // crear perfil pending si no existe
      const display = s.user.user_metadata?.name || s.user.email;
      const { data: created, error: upErr } = await supabase
        .from("profiles")
        .upsert({ id: s.user.id, display_name: display, email: s.user.email, role: "pending", approved: false })
        .select("*").maybeSingle();

      if (upErr) { console.warn("[profiles] upsert error:", upErr); if (mounted.current) setProfile(null); }
      else if (mounted.current) setProfile(created || null);
    } finally {
      inflight.current = false;
    }
  }, [session]);

  const refreshProfile = useCallback(async () => { await loadProfile(); }, [loadProfile]);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
      setLoading(false);
      if (data.session) await loadProfile(data.session); // carga inicial UNA vez

      const sub = supabase.auth.onAuthStateChange((_event, sess) => {
        setSession(sess);
        loadProfile(sess); // cada cambio de sesión dispara 1 carga
      });
      unsub = () => sub.data.subscription.unsubscribe();
    })();
    return () => unsub();
  }, [loadProfile]);

  return (
    <SessionCtx.Provider value={{ session, profile, loading, refreshProfile }}>
      {children}
    </SessionCtx.Provider>
  );
}
