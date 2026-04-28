import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { initDatabase, getDb, insertAgent } from '../database';
import { clearAllSessions, createSession, getSession } from '../session-manager';
import router from '../routes';
import { ConversationStep } from '../constants';
import type { Agent } from '../types';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id_agente: 'abc1234567',
    nombre_completo: 'Juan Pérez',
    telefono: '+525512345678',
    correo: 'juan@test.com',
    domicilio_estado: 'Jalisco',
    ramo_especialidad: 'GMM',
    segmento_cartera: 'C+',
    prima_promedio_poliza: 2000000,
    ...overrides,
  };
}

let app: express.Express;

beforeAll(() => {
  initDatabase(':memory:');
});

afterAll(() => {
  getDb().close();
});

beforeEach(() => {
  clearAllSessions();
  app = express();
  app.use(express.json());
  app.use(router);
});

describe('POST /api/chat/start', () => {
  it('returns sessionId, welcome message, and WELCOME step', async () => {
    const res = await request(app).post('/api/chat/start').send({});
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBeTruthy();
    expect(res.body.message).toBeTruthy();
    expect(res.body.step).toBe('WELCOME');
  });

  it('creates unique sessions on multiple calls', async () => {
    const res1 = await request(app).post('/api/chat/start').send({});
    const res2 = await request(app).post('/api/chat/start').send({});
    expect(res1.body.sessionId).not.toBe(res2.body.sessionId);
  });
});

describe('POST /api/chat/message', () => {
  it('returns 400 when sessionId is missing', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({ text: 'hello' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('ID de sesión');
  });

  it('returns 404 for unknown sessionId', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({ sessionId: 'nonexistent-id', text: 'hello' });
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('no encontrada');
  });

  it('returns 410 for expired session', async () => {
    const session = createSession();
    session.lastActivity = new Date(Date.now() - 31 * 60 * 1000);

    const res = await request(app)
      .post('/api/chat/message')
      .send({ sessionId: session.id, text: 'hello' });
    expect(res.status).toBe(410);
    expect(res.body.error).toContain('expirado');
  });

  it('processes WELCOME → NOMBRE transition', async () => {
    const startRes = await request(app).post('/api/chat/start').send({});
    const { sessionId } = startRes.body;

    const res = await request(app)
      .post('/api/chat/message')
      .send({ sessionId, text: 'sí' });
    expect(res.status).toBe(200);
    expect(res.body.step).toBe('NOMBRE');
    expect(res.body.sessionId).toBe(sessionId);
  });

  it('processes multiple steps in sequence', async () => {
    const startRes = await request(app).post('/api/chat/start').send({});
    const { sessionId } = startRes.body;

    // WELCOME → NOMBRE
    await request(app)
      .post('/api/chat/message')
      .send({ sessionId, text: 'sí' });

    // NOMBRE → TELEFONO
    const res = await request(app)
      .post('/api/chat/message')
      .send({ sessionId, text: 'María López' });
    expect(res.body.step).toBe('TELEFONO');
  });

  it('stays on same step with invalid input', async () => {
    const startRes = await request(app).post('/api/chat/start').send({});
    const { sessionId } = startRes.body;

    // WELCOME → NOMBRE
    await request(app)
      .post('/api/chat/message')
      .send({ sessionId, text: 'sí' });

    // NOMBRE → TELEFONO
    await request(app)
      .post('/api/chat/message')
      .send({ sessionId, text: 'María López' });

    // Invalid phone — stays on TELEFONO
    const res = await request(app)
      .post('/api/chat/message')
      .send({ sessionId, text: '123' });
    expect(res.body.step).toBe('TELEFONO');
  });
});

describe('GET /api/chat/session/:id', () => {
  it('returns session state for valid session', async () => {
    const startRes = await request(app).post('/api/chat/start').send({});
    const { sessionId } = startRes.body;

    const res = await request(app).get(`/api/chat/session/${sessionId}`);
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe(sessionId);
    expect(res.body.step).toBe('WELCOME');
    expect(res.body.profile).toEqual({});
  });

  it('returns 404 for unknown session', async () => {
    const res = await request(app).get('/api/chat/session/nonexistent-id');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('no encontrada');
  });

  it('returns 410 for expired session', async () => {
    const session = createSession();
    session.lastActivity = new Date(Date.now() - 31 * 60 * 1000);

    const res = await request(app).get(`/api/chat/session/${session.id}`);
    expect(res.status).toBe(410);
    expect(res.body.error).toContain('expirado');
  });

  it('reflects updated profile after messages', async () => {
    const startRes = await request(app).post('/api/chat/start').send({});
    const { sessionId } = startRes.body;

    // WELCOME → NOMBRE
    await request(app)
      .post('/api/chat/message')
      .send({ sessionId, text: 'sí' });

    // NOMBRE → TELEFONO
    await request(app)
      .post('/api/chat/message')
      .send({ sessionId, text: 'María López' });

    const res = await request(app).get(`/api/chat/session/${sessionId}`);
    expect(res.body.step).toBe('TELEFONO');
    expect(res.body.profile.nombreCompleto).toBe('María López');
  });
});

describe('Full flow with assignment', () => {
  beforeEach(() => {
    // Insert test agents
    try {
      insertAgent(makeAgent({
        id_agente: 'test000001',
        domicilio_estado: 'Jalisco',
        ramo_especialidad: 'GMM',
        segmento_cartera: 'C+',
        prima_promedio_poliza: 2000000,
      }));
    } catch {
      // Agent may already exist from previous test
    }
  });

  it('completes full flow from start to assignment', async () => {
    const startRes = await request(app).post('/api/chat/start').send({});
    const { sessionId } = startRes.body;

    // Walk through the flow
    await request(app).post('/api/chat/message').send({ sessionId, text: 'sí' });
    await request(app).post('/api/chat/message').send({ sessionId, text: 'María López' });
    await request(app).post('/api/chat/message').send({ sessionId, text: '5512345678' });
    await request(app).post('/api/chat/message').send({ sessionId, text: 'maria@test.com' });
    await request(app).post('/api/chat/message').send({ sessionId, text: 'Jalisco' });
    await request(app).post('/api/chat/message').send({ sessionId, text: 'Guadalajara' });
    await request(app).post('/api/chat/message').send({ sessionId, text: 'Centro, 44100' });
    await request(app).post('/api/chat/message').send({ sessionId, text: '41200' });
    await request(app).post('/api/chat/message').send({ sessionId, text: 'GMM' });

    // Confirm at RESUMEN
    const assignRes = await request(app)
      .post('/api/chat/message')
      .send({ sessionId, text: 'sí' });

    expect(assignRes.body.step).toBe('RESULTADO');
    expect(assignRes.body.agent).toBeTruthy();
    expect(assignRes.body.justification).toBeTruthy();
  });
});
