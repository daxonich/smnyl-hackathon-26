import type { AssignmentWeights, NSERange } from './types';

export enum ConversationStep {
  WELCOME = 'WELCOME',
  NOMBRE = 'NOMBRE',
  TELEFONO = 'TELEFONO',
  CORREO = 'CORREO',
  ESTADO = 'ESTADO',
  CIUDAD = 'CIUDAD',
  COLONIA_CP = 'COLONIA_CP',
  INGRESO = 'INGRESO',
  INGRESO_SKIP = 'INGRESO_SKIP',
  RAMO = 'RAMO',
  RAMO_INFERIR = 'RAMO_INFERIR',
  RESUMEN = 'RESUMEN',
  CORRECCION = 'CORRECCION',
  ASIGNACION = 'ASIGNACION',
  RESULTADO = 'RESULTADO',
  SIN_AGENTE = 'SIN_AGENTE',
  REASIGNACION = 'REASIGNACION',
  CIERRE = 'CIERRE',
}

export const NSE_TABLE: NSERange[] = [
  { nivel: 'A/B', lectura: 'Alto', ingresoMin: 78700, ingresoMax: Infinity, primaMin: 3000000, primaMax: 6000000 },
  { nivel: 'C+', lectura: 'Medio alto', ingresoMin: 41200, ingresoMax: 78700, primaMin: 1500000, primaMax: 3000000 },
  { nivel: 'C', lectura: 'Medio', ingresoMin: 31800, ingresoMax: 41200, primaMin: 800000, primaMax: 1500000 },
  { nivel: 'C−', lectura: 'Medio bajo', ingresoMin: 21500, ingresoMax: 31800, primaMin: 400000, primaMax: 800000 },
  { nivel: 'D+', lectura: 'Bajo alto', ingresoMin: 15100, ingresoMax: 21500, primaMin: 150000, primaMax: 400000 },
  { nivel: 'D', lectura: 'Bajo', ingresoMin: 5600, ingresoMax: 15100, primaMin: 50000, primaMax: 150000 },
  { nivel: 'E', lectura: 'Muy bajo', ingresoMin: 0, ingresoMax: 5600, primaMin: 12000, primaMax: 50000 },
];

export const NSE_PRIMA_RANGES: Record<string, [number, number]> = {
  'A/B': [3_000_000, 6_000_000],
  'C+': [1_500_000, 3_000_000],
  'C': [800_000, 1_500_000],
  'C−': [400_000, 800_000],
  'D+': [150_000, 400_000],
  'D': [50_000, 150_000],
  'E': [12_000, 50_000],
};

export const ESTADOS_MEXICO: string[] = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
];

export const RAMOS = ['VidaProtección', 'GMM', 'VidaAhorro'] as const;

export const DEFAULT_WEIGHTS: AssignmentWeights = {
  especialidad: 0.40,
  segmento: 0.35,
  geografia: 0.25,
};
