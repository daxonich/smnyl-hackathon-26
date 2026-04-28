import Database from 'better-sqlite3';
import path from 'path';
import type { Agent, AgentScore, ProspectProfile } from './types';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function initDatabase(dbPath?: string): Database.Database {
  const resolvedPath = dbPath ?? path.join(__dirname, '..', 'data.db');
  db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS agentes (
      id_agente TEXT PRIMARY KEY CHECK(length(id_agente) = 10),
      nombre_completo TEXT NOT NULL CHECK(length(nombre_completo) <= 150),
      telefono TEXT NOT NULL CHECK(length(telefono) <= 15),
      correo TEXT NOT NULL,
      domicilio_estado TEXT NOT NULL,
      ramo_especialidad TEXT NOT NULL CHECK(ramo_especialidad IN ('VidaProtección','GMM','VidaAhorro')),
      segmento_cartera TEXT NOT NULL CHECK(segmento_cartera IN ('A/B','C+','C','C−','D+','D','E')),
      prima_promedio_poliza REAL NOT NULL CHECK(prima_promedio_poliza >= 12000 AND prima_promedio_poliza <= 6000000)
    );

    CREATE TABLE IF NOT EXISTS prospectos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_completo TEXT NOT NULL,
      telefono TEXT NOT NULL,
      correo TEXT NOT NULL,
      estado TEXT NOT NULL,
      ciudad TEXT NOT NULL,
      colonia TEXT NOT NULL,
      codigo_postal TEXT NOT NULL,
      ingreso_mensual TEXT,
      nse TEXT,
      ramo_seguro TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS asignaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prospecto_id INTEGER NOT NULL,
      agente_id TEXT NOT NULL,
      score_total REAL NOT NULL,
      score_especialidad REAL NOT NULL,
      score_segmento REAL NOT NULL,
      score_geografia REAL NOT NULL,
      justificacion TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prospecto_id) REFERENCES prospectos(id),
      FOREIGN KEY (agente_id) REFERENCES agentes(id_agente)
    );
  `);

  return db;
}

export function insertAgent(agent: Agent): void {
  const stmt = getDb().prepare(`
    INSERT INTO agentes (id_agente, nombre_completo, telefono, correo, domicilio_estado, ramo_especialidad, segmento_cartera, prima_promedio_poliza)
    VALUES (@id_agente, @nombre_completo, @telefono, @correo, @domicilio_estado, @ramo_especialidad, @segmento_cartera, @prima_promedio_poliza)
  `);
  stmt.run(agent);
}

export function getAgentsByRamo(ramo: string): Agent[] {
  const stmt = getDb().prepare(`
    SELECT * FROM agentes WHERE ramo_especialidad = ?
  `);
  return stmt.all(ramo) as Agent[];
}

export function getAgentsByEstadoAndRamo(estado: string, ramo: string): Agent[] {
  const stmt = getDb().prepare(`
    SELECT * FROM agentes WHERE domicilio_estado = ? AND ramo_especialidad = ?
  `);
  return stmt.all(estado, ramo) as Agent[];
}

export function insertProspecto(profile: ProspectProfile): number {
  const stmt = getDb().prepare(`
    INSERT INTO prospectos (nombre_completo, telefono, correo, estado, ciudad, colonia, codigo_postal, ingreso_mensual, nse, ramo_seguro)
    VALUES (@nombreCompleto, @telefono, @correo, @estado, @ciudad, @colonia, @codigoPostal, @ingresoMensual, @nse, @ramoSeguro)
  `);
  const result = stmt.run(profile);
  return Number(result.lastInsertRowid);
}

export function insertAsignacion(
  prospectoId: number,
  agenteId: string,
  scores: AgentScore,
  justificacion: string
): number {
  const stmt = getDb().prepare(`
    INSERT INTO asignaciones (prospecto_id, agente_id, score_total, score_especialidad, score_segmento, score_geografia, justificacion)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    prospectoId,
    agenteId,
    scores.totalScore,
    scores.scoreEspecialidad,
    scores.scoreSegmento,
    scores.scoreGeografia,
    justificacion
  );
  return Number(result.lastInsertRowid);
}
