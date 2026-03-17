export const AUTH_STORAGE_KEY = "portflow.session";

export type AccountType = "COMPANY" | "CLIENT";

export type SessionUser = {
  email: string;
  name: string;
  role: string;
  accountType: AccountType;
  homePath: string;
  clientName?: string | null;
};

export type DemoAccessProfile = {
  id: string;
  label: string;
  email: string;
  password: string;
  description: string;
  user: SessionUser;
};

export const demoAccessProfiles: DemoAccessProfile[] = [
  {
    id: "company-ops",
    label: "Equipe PortFlow",
    email: "ops@portflow.io",
    password: "portflow123",
    description: "Perfil interno com acesso total ao centro operacional.",
    user: {
      email: "ops@portflow.io",
      name: "Pedro Operacoes",
      role: "Logistics Manager",
      accountType: "COMPANY",
      homePath: "/dashboard",
      clientName: null,
    },
  },
  {
    id: "client-braskem",
    label: "Cliente Braskem",
    email: "cliente.braskem@portflow.io",
    password: "braskem123",
    description: "Perfil externo para acompanhar apenas as cargas da Braskem.",
    user: {
      email: "cliente.braskem@portflow.io",
      name: "Camila Braskem",
      role: "Customer Portal",
      accountType: "CLIENT",
      homePath: "/client-portal",
      clientName: "Braskem",
    },
  },
];

const allowedClientPrefixes = ["/client-portal", "/container-details"];

function stripQuery(pathname?: string | null) {
  if (!pathname) {
    return "";
  }

  return pathname.split("?")[0] ?? pathname;
}

function normalizeLegacySession(user: Partial<SessionUser>) {
  const matchingProfile = demoAccessProfiles.find(
    (profile) => profile.user.email === user.email,
  );

  if (matchingProfile) {
    return matchingProfile.user;
  }

  return null;
}

export function findDemoAccessProfile(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return demoAccessProfiles.find(
    (profile) => profile.email === normalizedEmail && profile.password === password,
  );
}

export function readSession(): SessionUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SessionUser>;

    if (parsed.accountType && parsed.homePath) {
      return parsed as SessionUser;
    }

    return normalizeLegacySession(parsed);
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

export function getSessionHomePath(user: SessionUser | null) {
  if (!user) {
    return "/login";
  }

  return user.homePath || (user.accountType === "CLIENT" ? "/client-portal" : "/dashboard");
}

export function canAccessPath(user: SessionUser, pathname: string) {
  const cleanPath = stripQuery(pathname);

  if (user.accountType === "COMPANY") {
    return true;
  }

  return allowedClientPrefixes.some((prefix) => cleanPath.startsWith(prefix));
}

export function resolveAuthorizedPath(user: SessionUser, requestedPath?: string | null) {
  const cleanPath = stripQuery(requestedPath);

  if (cleanPath && canAccessPath(user, cleanPath)) {
    return requestedPath as string;
  }

  return getSessionHomePath(user);
}
