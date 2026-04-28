import { describe, it, expect } from 'vitest';
import { assignAgent, calculateScore } from '../assignment-engine';
import type { Agent, ProspectProfile } from '../types';
import { DEFAULT_WEIGHTS } from '../constants';

// --- Helpers ---

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id_agente: 'AGT0000001',
    nombre_completo: 'Juan Pérez López',
    telefono: '+525512345678',
    correo: 'juan@example.com',
    domicilio_estado: 'Jalisco',
    ramo_especialidad: 'GMM',
    segmento_cartera: 'C+',
    prima_promedio_poliza: 2_000_000,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<ProspectProfile> = {}): ProspectProfile {
  return {
    nombreCompleto: 'María García',
    telefono: '5598765432',
    correo: 'maria@example.com',
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

// --- Tests ---

describe('calculateScore', () => {
  it('calculates correct scores for a perfect match', () => {
    const agent = makeAgent({
      ramo_especialidad: 'GMM',
      segmento_cartera: 'C+',
      domicilio_estado: 'Jalisco',
    });
    const profile = makeProfile({ ramoSeguro: 'GMM', nse: 'C+', estado: 'Jalisco' });

    const score = calculateScore(agent, profile, 'C+');

    expect(score.scoreEspecialidad).toBe(1.0);
    expect(score.scoreSegmento).toBe(1.0);
    expect(score.scoreGeografia).toBe(1.0);
    expect(score.totalScore).toBeCloseTo(
      1.0 * 0.40 + 1.0 * 0.35 + 1.0 * 0.25,
    );
    expect(score.totalScore).toBeCloseTo(1.0);
  });

  it('scores 0 for especialidad when ramo does not match', () => {
    const agent = makeAgent({ ramo_especialidad: 'VidaProtección' });
    const profile = makeProfile({ ramoSeguro: 'GMM' });

    const score = calculateScore(agent, profile, 'C+');
    expect(score.scoreEspecialidad).toBe(0.0);
  });

  it('scores segmento based on NSE distance', () => {
    const agent = makeAgent({ segmento_cartera: 'C+' });
    const profile = makeProfile();

    // Exact match
    expect(calculateScore(agent, profile, 'C+').scoreSegmento).toBe(1.0);
    // 1 level away
    expect(calculateScore(agent, profile, 'C').scoreSegmento).toBe(0.7);
    // 2 levels away
    expect(calculateScore(agent, profile, 'C−').scoreSegmento).toBe(0.4);
    // 3+ levels away
    expect(calculateScore(agent, profile, 'D+').scoreSegmento).toBe(0.1);
    expect(calculateScore(agent, profile, 'E').scoreSegmento).toBe(0.1);
  });

  it('scores segmento as 0 when NSE is null', () => {
    const agent = makeAgent({ segmento_cartera: 'C+' });
    const profile = makeProfile({ nse: null });

    const score = calculateScore(agent, profile, null);
    expect(score.scoreSegmento).toBe(0);
  });

  it('scores geografia as 1 when states match (case-insensitive)', () => {
    const agent = makeAgent({ domicilio_estado: 'Jalisco' });
    const profile = makeProfile({ estado: 'jalisco' });

    const score = calculateScore(agent, profile, 'C+');
    expect(score.scoreGeografia).toBe(1.0);
  });

  it('scores geografia as 0 when states differ', () => {
    const agent = makeAgent({ domicilio_estado: 'Jalisco' });
    const profile = makeProfile({ estado: 'Nuevo León' });

    const score = calculateScore(agent, profile, 'C+');
    expect(score.scoreGeografia).toBe(0.0);
  });

  it('computes totalScore as weighted sum of three criteria', () => {
    const agent = makeAgent({
      ramo_especialidad: 'GMM',
      segmento_cartera: 'C',   // 1 level from C+
      domicilio_estado: 'Jalisco',
    });
    const profile = makeProfile({ ramoSeguro: 'GMM', nse: 'C+', estado: 'Jalisco' });

    const score = calculateScore(agent, profile, 'C+');
    const expected = 1.0 * 0.40 + 0.7 * 0.35 + 1.0 * 0.25;
    expect(score.totalScore).toBeCloseTo(expected);
  });
});

describe('assignAgent', () => {
  it('returns the agent with the highest total score', () => {
    const profile = makeProfile({ ramoSeguro: 'GMM', nse: 'C+', estado: 'Jalisco' });
    const agents = [
      makeAgent({ id_agente: 'A001', ramo_especialidad: 'GMM', segmento_cartera: 'D', domicilio_estado: 'Sonora' }),
      makeAgent({ id_agente: 'A002', ramo_especialidad: 'GMM', segmento_cartera: 'C+', domicilio_estado: 'Jalisco' }),
      makeAgent({ id_agente: 'A003', ramo_especialidad: 'GMM', segmento_cartera: 'C', domicilio_estado: 'Jalisco' }),
    ];

    const result = assignAgent(profile, agents);
    expect(result).not.toBeNull();
    expect(result!.agent.id_agente).toBe('A002'); // perfect match
  });

  it('breaks ties by prima closest to NSE midpoint', () => {
    const profile = makeProfile({ ramoSeguro: 'GMM', nse: 'C+', estado: 'Jalisco' });
    // C+ prima range: [1,500,000, 3,000,000], midpoint = 2,250,000
    const agents = [
      makeAgent({
        id_agente: 'A001',
        ramo_especialidad: 'GMM',
        segmento_cartera: 'C+',
        domicilio_estado: 'Jalisco',
        prima_promedio_poliza: 1_600_000, // distance = 650,000
      }),
      makeAgent({
        id_agente: 'A002',
        ramo_especialidad: 'GMM',
        segmento_cartera: 'C+',
        domicilio_estado: 'Jalisco',
        prima_promedio_poliza: 2_200_000, // distance = 50,000 (closest)
      }),
      makeAgent({
        id_agente: 'A003',
        ramo_especialidad: 'GMM',
        segmento_cartera: 'C+',
        domicilio_estado: 'Jalisco',
        prima_promedio_poliza: 2_900_000, // distance = 650,000
      }),
    ];

    const result = assignAgent(profile, agents);
    expect(result).not.toBeNull();
    expect(result!.agent.id_agente).toBe('A002');
  });

  it('relaxes geography: assigns agent even without estado match', () => {
    const profile = makeProfile({ ramoSeguro: 'GMM', nse: 'C+', estado: 'Jalisco' });
    const agents = [
      makeAgent({
        id_agente: 'A001',
        ramo_especialidad: 'GMM',
        segmento_cartera: 'C+',
        domicilio_estado: 'Nuevo León', // no geo match
      }),
    ];

    const result = assignAgent(profile, agents);
    expect(result).not.toBeNull();
    expect(result!.agent.id_agente).toBe('A001');
    expect(result!.scores.scoreGeografia).toBe(0.0);
    expect(result!.scores.scoreEspecialidad).toBe(1.0);
    expect(result!.scores.scoreSegmento).toBe(1.0);
  });

  it('relaxes segmento: assigns agent even without segmento match', () => {
    const profile = makeProfile({ ramoSeguro: 'GMM', nse: 'C+', estado: 'Jalisco' });
    const agents = [
      makeAgent({
        id_agente: 'A001',
        ramo_especialidad: 'GMM',
        segmento_cartera: 'E', // far from C+
        domicilio_estado: 'Sonora', // no geo match either
      }),
    ];

    const result = assignAgent(profile, agents);
    expect(result).not.toBeNull();
    expect(result!.agent.id_agente).toBe('A001');
    expect(result!.scores.scoreGeografia).toBe(0.0);
    expect(result!.scores.scoreSegmento).toBe(0.1); // 5 levels away → 0.1
  });

  it('returns null when no agents match the ramo', () => {
    const profile = makeProfile({ ramoSeguro: 'GMM' });
    const agents = [
      makeAgent({ ramo_especialidad: 'VidaProtección' }),
      makeAgent({ id_agente: 'A002', ramo_especialidad: 'VidaAhorro' }),
    ];

    const result = assignAgent(profile, agents);
    expect(result).toBeNull();
  });

  it('returns null for empty agents array', () => {
    const profile = makeProfile();
    const result = assignAgent(profile, []);
    expect(result).toBeNull();
  });

  it('handles single agent correctly', () => {
    const profile = makeProfile({ ramoSeguro: 'VidaAhorro', nse: 'A/B', estado: 'Ciudad de México' });
    const agents = [
      makeAgent({
        id_agente: 'SOLO01',
        ramo_especialidad: 'VidaAhorro',
        segmento_cartera: 'A/B',
        domicilio_estado: 'Ciudad de México',
        prima_promedio_poliza: 4_500_000,
      }),
    ];

    const result = assignAgent(profile, agents);
    expect(result).not.toBeNull();
    expect(result!.agent.id_agente).toBe('SOLO01');
    expect(result!.scores.totalScore).toBeCloseTo(1.0);
  });

  it('handles profile without NSE (null)', () => {
    const profile = makeProfile({ nse: null, ingresoMensual: null });
    const agents = [
      makeAgent({
        id_agente: 'A001',
        ramo_especialidad: 'GMM',
        domicilio_estado: 'Jalisco',
      }),
      makeAgent({
        id_agente: 'A002',
        ramo_especialidad: 'GMM',
        domicilio_estado: 'Sonora',
      }),
    ];

    const result = assignAgent(profile, agents);
    expect(result).not.toBeNull();
    // With null NSE, segmento score is 0 for all, so geography decides
    expect(result!.agent.id_agente).toBe('A001'); // Jalisco matches
    expect(result!.scores.scoreSegmento).toBe(0);
  });

  it('uses ingresoMensual to derive NSE when nse is null but income is provided', () => {
    const profile = makeProfile({
      nse: null,
      ingresoMensual: '$41,200-$78,700', // should classify as C+
      ramoSeguro: 'GMM',
      estado: 'Jalisco',
    });
    const agents = [
      makeAgent({
        id_agente: 'A001',
        ramo_especialidad: 'GMM',
        segmento_cartera: 'C+',
        domicilio_estado: 'Jalisco',
      }),
    ];

    const result = assignAgent(profile, agents);
    expect(result).not.toBeNull();
    expect(result!.scores.scoreSegmento).toBe(1.0); // C+ matches derived NSE
  });
});

describe('justification text', () => {
  it('mentions location when geography matches', () => {
    const profile = makeProfile({ estado: 'Jalisco', ramoSeguro: 'GMM', nse: 'C+' });
    const agents = [
      makeAgent({
        ramo_especialidad: 'GMM',
        segmento_cartera: 'C+',
        domicilio_estado: 'Jalisco',
      }),
    ];

    const result = assignAgent(profile, agents);
    expect(result).not.toBeNull();
    expect(result!.justification).toContain('Jalisco');
  });

  it('mentions specialization', () => {
    const profile = makeProfile({ ramoSeguro: 'GMM', nse: 'C+' });
    const agents = [
      makeAgent({ ramo_especialidad: 'GMM', segmento_cartera: 'C+' }),
    ];

    const result = assignAgent(profile, agents);
    expect(result).not.toBeNull();
    expect(result!.justification).toContain('GMM');
  });

  it('mentions similar profile when segmento score is high', () => {
    const profile = makeProfile({ ramoSeguro: 'GMM', nse: 'C+', estado: 'Sonora' });
    const agents = [
      makeAgent({
        ramo_especialidad: 'GMM',
        segmento_cartera: 'C+',
        domicilio_estado: 'Jalisco',
      }),
    ];

    const result = assignAgent(profile, agents);
    expect(result).not.toBeNull();
    expect(result!.justification).toContain('perfil similar');
  });

  it('produces non-empty justification even with minimal match', () => {
    const profile = makeProfile({ ramoSeguro: 'GMM', nse: 'E', estado: 'Sonora' });
    const agents = [
      makeAgent({
        ramo_especialidad: 'GMM',
        segmento_cartera: 'A/B',
        domicilio_estado: 'Jalisco',
      }),
    ];

    const result = assignAgent(profile, agents);
    expect(result).not.toBeNull();
    expect(result!.justification.length).toBeGreaterThan(0);
    // Even with low segmento score, especialidad still matches
    expect(result!.justification).toContain('GMM');
  });
});
