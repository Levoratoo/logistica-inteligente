export const AUTH_STORAGE_KEY = "portflow.session";

export const demoCredentials = {
  email: "ops@portflow.io",
  password: "portflow123",
};

export type SessionUser = {
  email: string;
  name: string;
  role: string;
};

export function readSession(): SessionUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function persistSession(user: SessionUser) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
