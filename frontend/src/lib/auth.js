const STORAGE_KEY = "hairsaloon_auth";

export function getStoredAuth() {
  if (typeof window === "undefined") {
    return { token: "", user: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { token: "", user: null };
    }

    const parsed = JSON.parse(raw);

    return {
      token: parsed?.token || "",
      user: parsed?.user || null,
    };
  } catch {
    return { token: "", user: null };
  }
}

export function saveAuth(auth) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function getToken() {
  return getStoredAuth().token;
}

export function hasRole(user, roles) {
  return Boolean(user?.role && roles.includes(user.role));
}

export function isSuperAdmin(user) {
  return user?.role === "super_admin";
}

export function canViewReports(user) {
  return Boolean(user?.role === "super_admin" || user?.can_view_reports);
}

export function roleLabel(role) {
  return String(role || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
