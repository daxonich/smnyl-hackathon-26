import { ESTADOS_MEXICO, NSE_PRIMA_RANGES, RAMOS } from './constants';
import { initDatabase, insertAgent } from './database';
import type { Agent } from './types';

const NOMBRES = [
  'Carlos', 'María', 'José', 'Ana', 'Luis', 'Guadalupe', 'Juan', 'Patricia',
  'Miguel', 'Rosa', 'Fernando', 'Claudia', 'Ricardo', 'Verónica', 'Alejandro',
  'Leticia', 'Roberto', 'Adriana', 'Francisco', 'Gabriela', 'Daniel', 'Silvia',
  'Jorge', 'Teresa', 'Eduardo', 'Laura', 'Arturo', 'Mónica', 'Sergio', 'Diana',
];

const APELLIDOS = [
  'García', 'Hernández', 'López', 'Martínez', 'González', 'Rodríguez', 'Pérez',
  'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz',
  'Morales', 'Reyes', 'Gutiérrez', 'Ortiz', 'Ramos', 'Castillo', 'Mendoza',
  'Vargas', 'Chávez', 'Romero', 'Jiménez', 'Aguilar', 'Medina', 'Castro', 'Ruiz',
];

const DOMINIOS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com.mx', 'prodigy.net.mx'];

const SEGMENTOS = Object.keys(NSE_PRIMA_RANGES);

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAlphanumeric(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function randomDigits(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function generateAgent(options?: {
  segmento?: string;
  ramo?: string;
}): Agent {
  const nombre = randomItem(NOMBRES);
  const apellidoPaterno = randomItem(APELLIDOS);
  const apellidoMaterno = randomItem(APELLIDOS);
  const nombreCompleto = `${nombre} ${apellidoPaterno} ${apellidoMaterno}`;

  const segmento = options?.segmento ?? randomItem(SEGMENTOS);
  const ramo = options?.ramo ?? randomItem(RAMOS);

  const [primaMin, primaMax] = NSE_PRIMA_RANGES[segmento];
  const prima = primaMin + Math.random() * (primaMax - primaMin);

  const nombreNorm = removeDiacritics(nombre).toLowerCase();
  const apellidoNorm = removeDiacritics(apellidoPaterno).toLowerCase();
  const correo = `${nombreNorm}.${apellidoNorm}${Math.floor(Math.random() * 100)}@${randomItem(DOMINIOS)}`;

  return {
    id_agente: randomAlphanumeric(10),
    nombre_completo: nombreCompleto,
    telefono: `+52${randomDigits(10)}`,
    correo,
    domicilio_estado: randomItem(ESTADOS_MEXICO),
    ramo_especialidad: ramo,
    segmento_cartera: segmento,
    prima_promedio_poliza: Math.round(prima * 100) / 100,
  };
}

export function generateAgents(count: number = 54): Agent[] {
  const agents: Agent[] = [];

  // Ensure coverage: one agent per (segmento, ramo) combination = 7 × 3 = 21
  for (const segmento of SEGMENTOS) {
    for (const ramo of RAMOS) {
      agents.push(generateAgent({ segmento, ramo }));
    }
  }

  // Fill remaining slots randomly
  const remaining = Math.max(0, count - agents.length);
  for (let i = 0; i < remaining; i++) {
    agents.push(generateAgent());
  }

  return agents;
}

async function main(): Promise<void> {
  console.log('Initializing database...');
  initDatabase();

  const agents = generateAgents(54);
  console.log(`Inserting ${agents.length} agents...`);

  for (const agent of agents) {
    insertAgent(agent);
  }

  console.log(`Seed complete. ${agents.length} agents inserted.`);
}

// Run when executed directly
const isDirectRun = require.main === module;
if (isDirectRun) {
  main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
