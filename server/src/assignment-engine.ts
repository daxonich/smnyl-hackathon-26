import type { Agent, AgentScore, AssignmentWeights, ProspectProfile } from './types';
import { DEFAULT_WEIGHTS, NSE_PRIMA_RANGES } from './constants';
import { classifyNSE, getNSEPrimaRange } from './nse';

export interface AssignmentResult {
  agent: Agent;
  scores: AgentScore;
  justification: string;
}

/** Ordered NSE levels from highest to lowest */
const NSE_LEVELS = ['A/B', 'C+', 'C', 'C−', 'D+', 'D', 'E'];

/**
 * Returns the index of an NSE level in the ordered scale.
 * Returns -1 if not found.
 */
function nseIndex(nse: string): number {
  return NSE_LEVELS.indexOf(nse);
}

/**
 * Calculates the segmento score based on NSE distance.
 * - Match exacto: 1.0
 * - 1 nivel de distancia: 0.7
 * - 2 niveles: 0.4
 * - 3+ niveles: 0.1
 */
function calculateSegmentoScore(agentSegmento: string, prospectNSE: string | null): number {
  if (!prospectNSE) return 0;
  const agentIdx = nseIndex(agentSegmento);
  const prospectIdx = nseIndex(prospectNSE);
  if (agentIdx === -1 || prospectIdx === -1) return 0;

  const distance = Math.abs(agentIdx - prospectIdx);
  if (distance === 0) return 1.0;
  if (distance === 1) return 0.7;
  if (distance === 2) return 0.4;
  return 0.1;
}

/**
 * Calculates the prima score: how close the agent's prima_promedio_poliza
 * is to the midpoint of the expected prima range for the prospect's NSE.
 * Returns a value between 0.0 and 1.0 (1.0 = exact match with midpoint).
 */
function calculatePrimaScore(agent: Agent, nse: string | null): number {
  if (!nse) return 0;
  const range = NSE_PRIMA_RANGES[nse];
  if (!range) return 0;

  const [primaMin, primaMax] = range;
  const midpoint = (primaMin + primaMax) / 2;
  const maxDistance = (primaMax - primaMin) / 2;

  if (maxDistance === 0) return 1.0;

  const distance = Math.abs(agent.prima_promedio_poliza - midpoint);
  const score = Math.max(0, 1 - distance / maxDistance);
  return score;
}

/**
 * Calculates the absolute distance of an agent's prima to the NSE midpoint.
 * Used for tiebreaking.
 */
function primaDistance(agent: Agent, nse: string | null): number {
  if (!nse) return Infinity;
  const range = NSE_PRIMA_RANGES[nse];
  if (!range) return Infinity;

  const [primaMin, primaMax] = range;
  const midpoint = (primaMin + primaMax) / 2;
  return Math.abs(agent.prima_promedio_poliza - midpoint);
}

/**
 * Calculates the full score for an agent against a prospect profile.
 */
export function calculateScore(
  agent: Agent,
  profile: ProspectProfile,
  nse: string | null,
  weights: AssignmentWeights = DEFAULT_WEIGHTS,
): AgentScore {
  const scoreEspecialidad = agent.ramo_especialidad === profile.ramoSeguro ? 1.0 : 0.0;
  const scoreSegmento = calculateSegmentoScore(agent.segmento_cartera, nse);
  const scoreGeografia =
    agent.domicilio_estado.toLowerCase() === profile.estado.toLowerCase() ? 1.0 : 0.0;
  const scorePrima = calculatePrimaScore(agent, nse);

  const totalScore =
    scoreEspecialidad * weights.especialidad +
    scoreSegmento * weights.segmento +
    scoreGeografia * weights.geografia;

  return {
    agente: agent,
    scoreEspecialidad,
    scoreSegmento,
    scoreGeografia,
    scorePrima,
    totalScore,
  };
}

/**
 * Generates a human-readable justification text explaining why the agent was selected.
 */
function generateJustification(scores: AgentScore, profile: ProspectProfile): string {
  const reasons: string[] = [];

  if (scores.scoreGeografia === 1.0) {
    reasons.push(`comparte tu ubicación en ${profile.estado}`);
  }

  if (scores.scoreSegmento >= 0.7) {
    reasons.push('tiene experiencia con clientes de perfil similar al tuyo');
  } else if (scores.scoreSegmento >= 0.4) {
    reasons.push('atiende clientes con un perfil cercano al tuyo');
  }

  if (scores.scoreEspecialidad === 1.0) {
    reasons.push(`es especialista en ${profile.ramoSeguro}`);
  }

  if (reasons.length === 0) {
    return `${scores.agente.nombre_completo} es especialista en ${profile.ramoSeguro} y está disponible para atenderte.`;
  }

  const joined =
    reasons.length === 1
      ? reasons[0]
      : reasons.slice(0, -1).join(', ') + ', y ' + reasons[reasons.length - 1];

  return `Tu agente ${joined}.`;
}

/**
 * Main assignment function. Finds the best agent for a prospect profile.
 *
 * Relaxation strategy:
 * 1. Try all three criteria (especialidad + segmento + geografía)
 * 2. Relax geography (ignore estado match)
 * 3. Relax segmento (accept any segmento)
 * 4. Always maintain ramo_especialidad match
 *
 * Returns null if no agent matches the ramo at all.
 */
export function assignAgent(
  profile: ProspectProfile,
  agents: Agent[],
  weights: AssignmentWeights = DEFAULT_WEIGHTS,
): AssignmentResult | null {
  const nse = profile.nse ?? (profile.ingresoMensual ? classifyNSE(parseIncome(profile.ingresoMensual)) : null);

  // Phase 1: Filter by ramo (always required)
  const candidates = agents.filter(
    (a) => a.ramo_especialidad === profile.ramoSeguro,
  );

  if (candidates.length === 0) {
    return null;
  }

  // Phase 2: Score all candidates
  const scored = candidates.map((agent) =>
    calculateScore(agent, profile, nse, weights),
  );

  // Phase 3: Sort by total score descending, tiebreak by prima distance ascending
  scored.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return primaDistance(a.agente, nse) - primaDistance(b.agente, nse);
  });

  const best = scored[0];

  // Phase 4: Relaxation — if best score is 0 on all three individual criteria,
  // we still return the best candidate (relaxation is implicit in the scoring:
  // agents with partial matches will score higher than those with none).
  // The relaxation order is:
  //   1. Geography is already the lowest weight (0.25), so it's naturally relaxed first
  //   2. Segmento (0.35) is relaxed next
  //   3. Especialidad is always maintained (filtered above)

  const justification = generateJustification(best, profile);

  return {
    agent: best.agente,
    scores: best,
    justification,
  };
}

/**
 * Parses an income string like "$5,600-$15,100" or "$78,700 o más"
 * and returns the lower bound as a number.
 */
function parseIncome(incomeStr: string): number {
  const cleaned = incomeStr.replace(/[$,]/g, '');
  const match = cleaned.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}
