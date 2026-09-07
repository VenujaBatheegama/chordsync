// Username management — stored in localStorage
const KEY = 'chordsync_username';

export function getUsername(): string | null {
  return localStorage.getItem(KEY);
}

export function setUsername(name: string): void {
  localStorage.setItem(KEY, name.trim());
}

export function clearUsername(): void {
  localStorage.removeItem(KEY);
}

// Simple UUID-ish user id (stable per browser)
const USER_ID_KEY = 'chordsync_userid';

export function getUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}
