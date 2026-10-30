// One place for the backend URL and the logged-in session.
export const API_URL = (process.env.REACT_APP_API_URL || "http://localhost:5001").replace(/\/$/, "");

const KEY = "attest.session";

export const getSession = () => {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
};
export const saveSession = (token, user) => localStorage.setItem(KEY, JSON.stringify({ token, user }));
export const clearSession = () => localStorage.removeItem(KEY);
export const isLoggedIn = () => !!getSession()?.token;

// fetch() with the auth header. On 401 the session is cleared and the user is sent to /login.
export async function api(path, options = {}) {
  const session = getSession();
  const headers = { ...(options.headers || {}) };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    options = { ...options, body: JSON.stringify(options.json) };
  }
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(`Cannot reach the server at ${API_URL}`);
  }
  if (res.status === 401 && session?.token && !path.startsWith("/auth/")) {
    clearSession();
    window.location.assign("/login");
  }
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// URL for <video src>, which cannot send headers
export const videoUrl = (evidenceId) =>
  `${API_URL}/files/${encodeURIComponent(evidenceId)}?token=${encodeURIComponent(getSession()?.token || "")}`;
