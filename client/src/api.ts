// API module for communicating with the chat backend.
// Implements retry on 503 and sessionStorage persistence.

export interface ChatStartResponse {
  sessionId: string;
  message: string;
  step: string;
  options?: string[];
}

export interface ChatMessageResponse {
  sessionId: string;
  message: string;
  step: string;
  options?: string[];
  summary?: Record<string, unknown>;
  agent?: Record<string, unknown>;
  justification?: string;
}

export interface SessionResponse {
  sessionId: string;
  step: string;
  profile: Record<string, unknown>;
}

const SESSION_KEY = 'chatSessionId';

/** Base path for API calls — must match the `base` in vite.config.ts (without trailing slash) */
const API_BASE = '/app';

/**
 * Wrapper around fetch that retries once on 503 after a 1-second delay.
 */
async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 503) {
    await new Promise((r) => setTimeout(r, 1000));
    return fetch(url, init);
  }
  return res;
}

/**
 * Starts a new chat session. Stores the sessionId in sessionStorage.
 */
export async function startChat(): Promise<ChatStartResponse> {
  const res = await fetchWithRetry(`${API_BASE}/api/chat/start`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`startChat failed: ${res.status}`);
  }
  const data: ChatStartResponse = await res.json();
  sessionStorage.setItem(SESSION_KEY, data.sessionId);
  return data;
}

/**
 * Sends a prospect message within an existing session.
 */
export async function sendMessage(sessionId: string, text: string): Promise<ChatMessageResponse> {
  const res = await fetchWithRetry(`${API_BASE}/api/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, text }),
  });
  if (!res.ok) {
    throw new Error(`sendMessage failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Retrieves an existing session by id.
 * Returns null if the session is not found (404) or expired (410),
 * and clears sessionStorage in those cases.
 */
export async function getSession(sessionId: string): Promise<SessionResponse | null> {
  const res = await fetchWithRetry(`${API_BASE}/api/chat/session/${sessionId}`);
  if (res.status === 404 || res.status === 410) {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
  if (!res.ok) {
    throw new Error(`getSession failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Returns the stored sessionId from sessionStorage, or null.
 */
export function getSavedSessionId(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

/**
 * Clears the stored sessionId from sessionStorage.
 */
export function clearSavedSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
