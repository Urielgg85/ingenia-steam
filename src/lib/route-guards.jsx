// src/lib/route-guards.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "./session.jsx";
import { canCreate, isAdmin } from "./perm.js";

export function RequireCreate({ children }) {
  const { session, profile, loading } = useSession();
  const loc = useLocation();
  if (loading) return null;
  return canCreate(session, profile)
    ? children
    : (
      <Navigate
        to={`/auth?reason=need_approval&next=${encodeURIComponent(loc.pathname)}`}
        replace
      />
    );
}

export function RequireAdmin({ children }) {
  const { session, profile, loading } = useSession();
  const loc = useLocation();
  if (loading) return null;
  return (session && isAdmin(profile))
    ? children
    : (
      <Navigate
        to={`/auth?reason=admin_only&next=${encodeURIComponent(loc.pathname)}`}
        replace
      />
    );
}
