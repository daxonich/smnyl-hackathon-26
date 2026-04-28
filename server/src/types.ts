import { ConversationStep } from './constants';

export interface ProspectProfile {
  nombreCompleto: string;
  telefono: string;
  correo: string;
  estado: string;
  ciudad: string;
  colonia: string;
  codigoPostal: string;
  ingresoMensual: string | null;
  nse: string | null;
  ramoSeguro: string;
}

export interface Agent {
  id_agente: string;
  nombre_completo: string;
  telefono: string;
  correo: string;
  domicilio_estado: string;
  ramo_especialidad: string;
  segmento_cartera: string;
  prima_promedio_poliza: number;
}

export interface AgentScore {
  agente: Agent;
  scoreEspecialidad: number;
  scoreSegmento: number;
  scoreGeografia: number;
  scorePrima: number;
  totalScore: number;
}

export interface AssignmentWeights {
  especialidad: number;
  segmento: number;
  geografia: number;
}

export interface ChatSession {
  id: string;
  step: ConversationStep;
  profile: Partial<ProspectProfile>;
  createdAt: Date;
  lastActivity: Date;
}

export interface ChatResponse {
  sessionId: string;
  message: string;
  step: ConversationStep;
  options?: string[];
  summary?: ProspectProfile;
  agent?: Agent;
  justification?: string;
}

export interface NSERange {
  nivel: string;
  lectura: string;
  ingresoMin: number;
  ingresoMax: number;
  primaMin: number;
  primaMax: number;
}
