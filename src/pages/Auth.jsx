// src/pages/Auth.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";

export default function Auth() {
  const { session, profile } = useSession();
  const nav = useNavigate();
  const loc = useLocation();

  const qs = useMemo(() => new URLSearchParams(loc.search), [loc.search]);
  const reason = qs.get("reason") || "";
  const next = qs.get("next") || "/";

  const [tab, setTab] = useState("login"); // 'login' | 'request'
  const [email, setEmail] = useState(session?.user?.email || "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // request form
  const [role, setRole] = useState("teacher"); // 'org_admin' | 'teacher' | 'student'
  const [orgs, setOrgs] = useState([]);
  const [orgId, setOrgId] = useState("");
  const [orgName, setOrgName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // Cargar catálogo de escuelas para el selector (no bloquear si falla)
    (async () => {
      try {
        const { data } = await supabase
          .from("organizations")
          .select("id,name")
          .order("name");
        setOrgs(data || []);
      } catch {
        setOrgs([]);
      }
    })();
  }, []);

  // Si ya estás dentro y aprobado, salta a "next" (o inicio)
  useEffect(() => {
    if (session && profile?.approved) {
      nav(next, { replace: true });
    }
  }, [session, profile?.approved, next, nav]);

  // Texto de ayuda por razón
  const reasonNote =
    reason === "need_approval"
      ? "Necesitas que un administrador apruebe tu cuenta para crear/editar."
      : reason === "admin_only"
      ? "Esta sección es solo para administradores."
      : "";

  async function sendMagic() {
    setBusy(true);
    setMsg("");
    try {
      if (!email) throw new Error("Escribe tu correo.");
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + "/auth?next=" + encodeURIComponent(next) },
      });
      if (error) throw error;
      setMsg("¡Listo! Te enviamos un link de acceso. Revisa tu correo.");
    } catch (e) {
      setMsg("Error: " + (e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function requestAccess() {
    setBusy(true);
    setMsg("");
    try {
      if (!email) throw new Error("Escribe tu correo.");

      // ¿Ya tienes una solicitud pendiente?
      const { data: existing } = await supabase
        .from("signup_requests")
        .select("id,status")
        .eq("status", "pending")
        .ilike("email", email)
        .maybeSingle();

      if (existing) {
        setMsg("Ya hay una solicitud pendiente para este correo.");
        setBusy(false);
        return;
      }

      // Si ya estás aprobado, invita a entrar
      const { data: profApproved } = await supabase
        .from("profiles")
        .select("approved,role")
        .ilike("email", email)
        .maybeSingle();
      if (profApproved?.approved) {
        setMsg("Tu cuenta ya está aprobada. Usa 'Entrar' para acceder.");
        setTab("login");
        setBusy(false);
        return;
      }

      const payload = {
        email,
        requested_role: role,
        org_id: orgId || null,
        org_name: orgId ? null : orgName || null,
        notes,
        status: "pending",
      };

      const { error } = await supabase.from("signup_requests").insert(payload);
      if (error) throw error;

      setMsg("¡Solicitud enviada! Un administrador la revisará.");
    } catch (e) {
      setMsg("Error: " + (e.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-lg mx-auto p-6 space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="title">Acceso</h1>
      </header>

      {reasonNote && <div className="card">{reasonNote}</div>}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          className={`chip ${tab === "login" ? "active" : ""}`}
          onClick={() => setTab("login")}
        >
          Entrar
        </button>
        <button
          className={`chip ${tab === "request" ? "active" : ""}`}
          onClick={() => setTab("request")}
        >
          Solicitar acceso
        </button>
      </div>

      {/* Correo (común) */}
      <div>
        <label className="label">Correo</label>
        <input
          className="input"
          type="email"
          placeholder="tucorreo@escuela.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {/* Tab: Login */}
      {tab === "login" && (
        <section className="space-y-3">
          <button className="btn" disabled={busy || !email} onClick={sendMagic}>
            Enviar link de acceso
          </button>

          <p className="text-sm text-slate-500">
            No crea cuenta ni solicitud. Solo te enviamos un link mágico al correo.
          </p>

          {!profile?.approved && session?.user && (
            <div className="card">
              Estás autenticado pero tu cuenta aún no está aprobada. Puedes enviar una
              solicitud en la pestaña <b>“Solicitar acceso”</b>.
            </div>
          )}
        </section>
      )}

      {/* Tab: Request */}
      {tab === "request" && (
        <section className="space-y-3">
          <div>
            <label className="label">Quiero ser</label>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="org_admin">Admin escuela</option>
              <option value="teacher">Maestro</option>
              <option value="student">Alumno</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="label">Selecciona escuela (opcional)</label>
            <select
              className="input"
              value={orgId}
              onChange={(e) => {
                setOrgId(e.target.value);
                if (e.target.value) setOrgName("");
              }}
            >
              <option value="">— Elegir escuela —</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>

            <label className="label">…o escribe una nueva</label>
            <input
              className="input"
              placeholder="Nombre de escuela (si no aparece en la lista)"
              value={orgName}
              disabled={!!orgId}
              onChange={(e) => setOrgName(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Si escribes un nombre y no eliges de la lista, el administrador podrá crearla al aprobar.
            </p>
          </div>

          <div>
            <label className="label">Notas (opcional)</label>
            <textarea
              className="input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button className="btn" disabled={busy || !email} onClick={requestAccess}>
            Enviar solicitud
          </button>
        </section>
      )}

      {!!msg && <div className="card">{msg}</div>}

      {/* Si ya está autenticado, opciones rápidas */}
      {session && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              Sesión iniciada como <b>{session.user.email}</b>
              {profile && (
                <span className="text-slate-500">
                  {" "}
                  · Estado: {profile.approved ? "aprobado" : "pendiente"}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                className="btn-outline"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/auth";
                }}
              >
                Cerrar sesión
              </button>
              <button className="btn" onClick={() => nav("/", { replace: true })}>
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
