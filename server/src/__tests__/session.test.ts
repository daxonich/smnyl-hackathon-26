import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createSession,
  getSession,
  updateSession,
  cleanExpiredSessions,
  clearAllSessions,
  getSessionCount,
  isSessionExpired,
} from '../session-manager';
import { ConversationStep } from '../constants';

describe('session-manager', () => {
  beforeEach(() => {
    clearAllSessions();
    vi.restoreAllMocks();
  });

  describe('createSession', () => {
    it('returns a session with a valid UUID id', () => {
      const session = createSession();
      expect(session.id).toBeTruthy();
      expect(session.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('initializes with step WELCOME and empty profile', () => {
      const session = createSession();
      expect(session.step).toBe(ConversationStep.WELCOME);
      expect(session.profile).toEqual({});
    });

    it('sets createdAt and lastActivity to current time', () => {
      const before = Date.now();
      const session = createSession();
      const after = Date.now();
      expect(session.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(session.createdAt.getTime()).toBeLessThanOrEqual(after);
      expect(session.lastActivity.getTime()).toBeGreaterThanOrEqual(before);
      expect(session.lastActivity.getTime()).toBeLessThanOrEqual(after);
    });

    it('creates unique session IDs', () => {
      const s1 = createSession();
      const s2 = createSession();
      expect(s1.id).not.toBe(s2.id);
    });
  });

  describe('getSession', () => {
    it('returns null for unknown ID', () => {
      expect(getSession('nonexistent-id')).toBeNull();
    });

    it('returns the session for a valid ID', () => {
      const created = createSession();
      const retrieved = getSession(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.step).toBe(ConversationStep.WELCOME);
    });

    it('returns null for expired session', () => {
      const session = createSession();
      // Manually set lastActivity to 31 minutes ago
      session.lastActivity = new Date(Date.now() - 31 * 60 * 1000);
      expect(getSession(session.id)).toBeNull();
    });

    it('returns session that is still within TTL', () => {
      const session = createSession();
      // Set lastActivity to 29 minutes ago (within 30 min TTL)
      session.lastActivity = new Date(Date.now() - 29 * 60 * 1000);
      expect(getSession(session.id)).not.toBeNull();
    });
  });

  describe('isSessionExpired', () => {
    it('returns false for unknown ID', () => {
      expect(isSessionExpired('nonexistent')).toBe(false);
    });

    it('returns false for active session', () => {
      const session = createSession();
      expect(isSessionExpired(session.id)).toBe(false);
    });

    it('returns true for expired session and removes it', () => {
      const session = createSession();
      session.lastActivity = new Date(Date.now() - 31 * 60 * 1000);
      expect(isSessionExpired(session.id)).toBe(true);
      // Session should be removed after expiration check
      expect(getSessionCount()).toBe(0);
    });
  });

  describe('updateSession', () => {
    it('updates the step', () => {
      const session = createSession();
      const updated = updateSession(session.id, { step: ConversationStep.NOMBRE });
      expect(updated).not.toBeNull();
      expect(updated!.step).toBe(ConversationStep.NOMBRE);
    });

    it('updates the profile', () => {
      const session = createSession();
      const updated = updateSession(session.id, {
        profile: { nombreCompleto: 'Test User' },
      });
      expect(updated).not.toBeNull();
      expect(updated!.profile.nombreCompleto).toBe('Test User');
    });

    it('merges profile updates without overwriting other fields', () => {
      const session = createSession();
      updateSession(session.id, { profile: { nombreCompleto: 'Test' } });
      updateSession(session.id, { profile: { telefono: '5512345678' } });
      const retrieved = getSession(session.id);
      expect(retrieved!.profile.nombreCompleto).toBe('Test');
      expect(retrieved!.profile.telefono).toBe('5512345678');
    });

    it('refreshes lastActivity on update', () => {
      const session = createSession();
      const originalActivity = session.lastActivity.getTime();
      // Small delay to ensure time difference
      const updated = updateSession(session.id, { step: ConversationStep.TELEFONO });
      expect(updated!.lastActivity.getTime()).toBeGreaterThanOrEqual(originalActivity);
    });

    it('returns null for unknown session ID', () => {
      expect(updateSession('nonexistent', { step: ConversationStep.NOMBRE })).toBeNull();
    });
  });

  describe('cleanExpiredSessions', () => {
    it('removes expired sessions', () => {
      const s1 = createSession();
      const s2 = createSession();
      // Expire s1
      s1.lastActivity = new Date(Date.now() - 31 * 60 * 1000);
      const removed = cleanExpiredSessions();
      expect(removed).toBe(1);
      expect(getSession(s1.id)).toBeNull();
      expect(getSession(s2.id)).not.toBeNull();
    });

    it('returns 0 when no sessions are expired', () => {
      createSession();
      createSession();
      expect(cleanExpiredSessions()).toBe(0);
    });

    it('removes all sessions when all are expired', () => {
      const s1 = createSession();
      const s2 = createSession();
      s1.lastActivity = new Date(Date.now() - 31 * 60 * 1000);
      s2.lastActivity = new Date(Date.now() - 35 * 60 * 1000);
      const removed = cleanExpiredSessions();
      expect(removed).toBe(2);
      expect(getSessionCount()).toBe(0);
    });
  });
});
