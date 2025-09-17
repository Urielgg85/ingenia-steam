// src/lib/perm.js
export const isApproved = (p) => !!p?.approved;
export const isTeacherLike = (p) =>
  ["teacher", "org_admin", "platform_admin"].includes(p?.role);
export const canCreate = (session, p) =>
  Boolean(session && isApproved(p) && isTeacherLike(p));
export const isAdmin = (p) =>
  ["org_admin", "platform_admin"].includes(p?.role);
export const isPlatformAdmin = (p) => p?.role === "platform_admin";
