import { v4 as uuidv4 } from 'uuid';
import { ConversationStep } from './constants';
import type { ChatSession, ProspectProfile } from './types';

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

const sessions = new Map<string, ChatSession>();

/**
 * Creates a new chat session with step=WELCOME and empty profile.
 */
export function createSession(): ChatSession {
  const session: ChatSession = {
    id: uuidv4(),
    step: ConversationStep.WELCOME,
    profile: {},
    createdAt: new Date(),
    lastActivity: new Date(),
  };
  sessions.set(session.id, session);
  return session;
}

/**
 * Returns a session by ID, or null if not found or expired.
 */
export function getSession(id: string): ChatSession | null {
  const session = sessions.get(id);
  if (!session) return null;

  const now = Date.now();
  if (now - session.lastActivity.getTime() > SESSION_TTL_MS) {
    sessions.delete(id);
    return null;
  }

  return session;
}

/**
 * Checks if a session exists but is expired (for distinguishing 404 vs 410).
 * Returns true if the session was found but expired (and was cleaned up).
 */
export function isSessionExpired(id: string): boolean {
  const session = sessions.get(id);
  if (!session) return false;

  const now = Date.now();
  if (now - session.lastActivity.getTime() > SESSION_TTL_MS) {
    sessions.delete(id);
    return true;
  }
  return false;
}

/**
 * Updates a session's step and/or profile, refreshing lastActivity.
 */
export function updateSession(
  id: string,
  updates: { step?: ConversationStep; profile?: Partial<ProspectProfile> },
): ChatSession | null {
  const session = sessions.get(id);
  if (!session) return null;

  if (updates.step !== undefined) {
    session.step = updates.step;
  }
  if (updates.profile !== undefined) {
    session.profile = { ...session.profile, ...updates.profile };
  }
  session.lastActivity = new Date();
  return session;
}

/**
 * Removes all sessions that have been inactive for longer than the TTL.
 */
export function cleanExpiredSessions(): number {
  const now = Date.now();
  let removed = 0;
  for (const [id, session] of sessions) {
    if (now - session.lastActivity.getTime() > SESSION_TTL_MS) {
      sessions.delete(id);
      removed++;
    }
  }
  return removed;
}

/**
 * Clears all sessions (useful for testing).
 */
export function clearAllSessions(): void {
  sessions.clear();
}

/**
 * Returns the number of active sessions (useful for testing/monitoring).
 */
export function getSessionCount(): number {
  return sessions.size;
}
