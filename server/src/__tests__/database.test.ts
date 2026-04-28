import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initDatabase,
  insertAgent,
  getAgentsByRamo,
  getAgentsByEstadoAndRamo,
  insertProspecto,
  insertAsignacion,
  getDb,
} from '../database';
import type { Agent, AgentScore, ProspectProfile } from '../types';

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

function makeProfile(overrides: Partial<ProspectProfile> = {}): ProspectProfile {
  return {
    nombreCompleto: 'María López',
    telefono: '5598765432',
    correo: 'maria@test.com',
    estado: 'Jalisco',
    ciudad: 'Guadalajara',
    colonia: 'Centro',
    codigoPostal: '44100',
    ingresoMensual: '$41,200-$78,700',
    nse: 'C+',
    ramoSeguro: 'GMM',
    ...overrides,
  };
}

describe('database', () => {
  beforeEach(() => {
    initDatabase(':memory:');
  });

  afterEach(() => {
    getDb().close();
  });

  describe('initDatabase', () => {
    it('creates the three tables', () => {
      const tables = getDb()
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all() as { name: string }[];
      const names = tables.map((t) => t.name);
      expect(names).toContain('agentes');
      expect(names).toContain('prospectos');
      expect(names).toContain('asignaciones');
    });
  });

  describe('insertAgent / getAgentsByRamo', () => {
    it('inserts and retrieves agents by ramo', () => {
      const gmm = makeAgent({ id_agente: 'aaaa000001', ramo_especialidad: 'GMM' });
      const vida = makeAgent({ id_agente: 'aaaa000002', ramo_especialidad: 'VidaProtección', prima_promedio_poliza: 500000, segmento_cartera: 'C−' });
      insertAgent(gmm);
      insertAgent(vida);

      const gmmAgents = getAgentsByRamo('GMM');
      expect(gmmAgents).toHaveLength(1);
      expect(gmmAgents[0].id_agente).toBe('aaaa000001');

      const vidaAgents = getAgentsByRamo('VidaProtección');
      expect(vidaAgents).toHaveLength(1);
      expect(vidaAgents[0].id_agente).toBe('aaaa000002');

      expect(getAgentsByRamo('VidaAhorro')).toHaveLength(0);
    });
  });

  describe('getAgentsByEstadoAndRamo', () => {
    it('filters by both estado and ramo', () => {
      insertAgent(makeAgent({ id_agente: 'aaaa000001', domicilio_estado: 'Jalisco', ramo_especialidad: 'GMM' }));
      insertAgent(makeAgent({ id_agente: 'aaaa000002', domicilio_estado: 'Jalisco', ramo_especialidad: 'VidaProtección', prima_promedio_poliza: 500000, segmento_cartera: 'C−' }));
      insertAgent(makeAgent({ id_agente: 'aaaa000003', domicilio_estado: 'Puebla', ramo_especialidad: 'GMM' }));

      const result = getAgentsByEstadoAndRamo('Jalisco', 'GMM');
      expect(result).toHaveLength(1);
      expect(result[0].id_agente).toBe('aaaa000001');
    });
  });

  describe('insertProspecto', () => {
    it('inserts a prospect and returns the id', () => {
      const id = insertProspecto(makeProfile());
      expect(id).toBe(1);

      const row = getDb().prepare('SELECT * FROM prospectos WHERE id = ?').get(id) as any;
      expect(row.nombre_completo).toBe('María López');
      expect(row.ramo_seguro).toBe('GMM');
    });

    it('handles null ingreso_mensual and nse', () => {
      const id = insertProspecto(makeProfile({ ingresoMensual: null, nse: null }));
      const row = getDb().prepare('SELECT * FROM prospectos WHERE id = ?').get(id) as any;
      expect(row.ingreso_mensual).toBeNull();
      expect(row.nse).toBeNull();
    });
  });

  describe('insertAsignacion', () => {
    it('inserts an assignment linked to prospecto and agente', () => {
      insertAgent(makeAgent({ id_agente: 'aaaa000001' }));
      const prospectoId = insertProspecto(makeProfile());

      const scores: AgentScore = {
        agente: makeAgent({ id_agente: 'aaaa000001' }),
        scoreEspecialidad: 1.0,
        scoreSegmento: 0.7,
        scoreGeografia: 1.0,
        scorePrima: 0.9,
        totalScore: 0.865,
      };

      const asignacionId = insertAsignacion(prospectoId, 'aaaa000001', scores, 'Agente con mejor afinidad');
      expect(asignacionId).toBe(1);

      const row = getDb().prepare('SELECT * FROM asignaciones WHERE id = ?').get(asignacionId) as any;
      expect(row.prospecto_id).toBe(prospectoId);
      expect(row.agente_id).toBe('aaaa000001');
      expect(row.score_total).toBeCloseTo(0.865);
      expect(row.justificacion).toBe('Agente con mejor afinidad');
    });
  });

  describe('CHECK constraints', () => {
    it('rejects agent with invalid ramo_especialidad', () => {
      expect(() =>
        insertAgent(makeAgent({ id_agente: 'aaaa000001', ramo_especialidad: 'Invalido' as any }))
      ).toThrow();
    });

    it('rejects agent with prima out of range', () => {
      expect(() =>
        insertAgent(makeAgent({ id_agente: 'aaaa000001', prima_promedio_poliza: 5000 }))
      ).toThrow();
    });

    it('rejects agent with id_agente not 10 chars', () => {
      expect(() =>
        insertAgent(makeAgent({ id_agente: 'short' }))
      ).toThrow();
    });
  });
});
