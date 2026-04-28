import { describe, it, expect } from 'vitest';
import { processMessage, getWelcomeMessage, generateSummary } from '../flow-engine';
import { ConversationStep } from '../constants';
import type { ProspectProfile } from '../types';

describe('getWelcomeMessage', () => {
  it('returns a non-empty welcome message', () => {
    const msg = getWelcomeMessage();
    expect(msg).toBeTruthy();
    expect(msg.length).toBeGreaterThan(0);
  });

  it('mentions the purpose of the system', () => {
    const msg = getWelcomeMessage();
    expect(msg.toLowerCase()).toContain('seguro');
  });
});

describe('generateSummary', () => {
  it('includes all provided fields', () => {
    const profile: Partial<ProspectProfile> = {
      nombreCompleto: 'María López',
      telefono: '5512345678',
      correo: 'maria@test.com',
      estado: 'Jalisco',
      ciudad: 'Guadalajara',
      colonia: 'Centro',
      codigoPostal: '44100',
      ingresoMensual: '$41,200 - $78,700',
      ramoSeguro: 'GMM',
    };
    const summary = generateSummary(profile);
    expect(summary).toContain('María López');
    expect(summary).toContain('5512345678');
    expect(summary).toContain('maria@test.com');
    expect(summary).toContain('Jalisco');
    expect(summary).toContain('Guadalajara');
    expect(summary).toContain('Centro');
    expect(summary).toContain('44100');
    expect(summary).toContain('$41,200 - $78,700');
    expect(summary).toContain('GMM');
  });

  it('shows "No proporcionado" when ingresoMensual is null', () => {
    const profile: Partial<ProspectProfile> = {
      nombreCompleto: 'Test',
      ingresoMensual: null,
    };
    const summary = generateSummary(profile);
    expect(summary).toContain('No proporcionado');
  });

  it('omits fields that are undefined', () => {
    const summary = generateSummary({});
    expect(summary).not.toContain('Nombre:');
    expect(summary).not.toContain('Teléfono:');
  });
});

describe('processMessage — Happy path', () => {
  it('walks through the entire flow from WELCOME to ASIGNACION', () => {
    let profile: Partial<ProspectProfile> = {};
    let result;

    // WELCOME → NOMBRE
    result = processMessage(ConversationStep.WELCOME, 'sí', profile);
    expect(result.step).toBe(ConversationStep.NOMBRE);
    profile = result.profile;

    // NOMBRE → TELEFONO
    result = processMessage(ConversationStep.NOMBRE, 'María López García', profile);
    expect(result.step).toBe(ConversationStep.TELEFONO);
    expect(result.profile.nombreCompleto).toBe('María López García');
    profile = result.profile;

    // TELEFONO → CORREO
    result = processMessage(ConversationStep.TELEFONO, '5512345678', profile);
    expect(result.step).toBe(ConversationStep.CORREO);
    expect(result.profile.telefono).toBe('5512345678');
    profile = result.profile;

    // CORREO → ESTADO
    result = processMessage(ConversationStep.CORREO, 'maria@example.com', profile);
    expect(result.step).toBe(ConversationStep.ESTADO);
    expect(result.profile.correo).toBe('maria@example.com');
    profile = result.profile;

    // ESTADO → CIUDAD
    result = processMessage(ConversationStep.ESTADO, 'Jalisco', profile);
    expect(result.step).toBe(ConversationStep.CIUDAD);
    expect(result.profile.estado).toBe('Jalisco');
    profile = result.profile;

    // CIUDAD → COLONIA_CP
    result = processMessage(ConversationStep.CIUDAD, 'Guadalajara', profile);
    expect(result.step).toBe(ConversationStep.COLONIA_CP);
    expect(result.profile.ciudad).toBe('Guadalajara');
    profile = result.profile;

    // COLONIA_CP → INGRESO
    result = processMessage(ConversationStep.COLONIA_CP, 'Centro, 44100', profile);
    expect(result.step).toBe(ConversationStep.INGRESO);
    expect(result.profile.colonia).toBe('Centro');
    expect(result.profile.codigoPostal).toBe('44100');
    expect(result.options).toBeDefined();
    profile = result.profile;

    // INGRESO → RAMO (select an income range)
    result = processMessage(ConversationStep.INGRESO, '$41,200', profile);
    expect(result.step).toBe(ConversationStep.RAMO);
    expect(result.profile.ingresoMensual).toBeTruthy();
    expect(result.profile.nse).toBeTruthy();
    expect(result.options).toBeDefined();
    profile = result.profile;

    // RAMO → RESUMEN
    result = processMessage(ConversationStep.RAMO, 'GMM', profile);
    expect(result.step).toBe(ConversationStep.RESUMEN);
    expect(result.profile.ramoSeguro).toBe('GMM');
    profile = result.profile;

    // RESUMEN → ASIGNACION (confirm)
    result = processMessage(ConversationStep.RESUMEN, 'sí', profile);
    expect(result.step).toBe(ConversationStep.ASIGNACION);
    profile = result.profile;
  });
});

describe('processMessage — WELCOME', () => {
  it('advances to NOMBRE on any input', () => {
    const result = processMessage(ConversationStep.WELCOME, 'ok', {});
    expect(result.step).toBe(ConversationStep.NOMBRE);
  });

  it('advances to NOMBRE even with empty input', () => {
    const result = processMessage(ConversationStep.WELCOME, '', {});
    expect(result.step).toBe(ConversationStep.NOMBRE);
  });
});

describe('processMessage — TELEFONO validation', () => {
  it('stays on TELEFONO with invalid phone (too short)', () => {
    const result = processMessage(ConversationStep.TELEFONO, '12345', {});
    expect(result.step).toBe(ConversationStep.TELEFONO);
    expect(result.message).toContain('10 dígitos');
  });

  it('stays on TELEFONO with letters', () => {
    const result = processMessage(ConversationStep.TELEFONO, 'abcdefghij', {});
    expect(result.step).toBe(ConversationStep.TELEFONO);
  });

  it('advances to CORREO with valid 10-digit phone', () => {
    const result = processMessage(ConversationStep.TELEFONO, '5512345678', {});
    expect(result.step).toBe(ConversationStep.CORREO);
    expect(result.profile.telefono).toBe('5512345678');
  });
});

describe('processMessage — CORREO validation', () => {
  it('stays on CORREO with invalid email (no @)', () => {
    const result = processMessage(ConversationStep.CORREO, 'notanemail', {});
    expect(result.step).toBe(ConversationStep.CORREO);
    expect(result.message).toContain('correo');
  });

  it('stays on CORREO with invalid email (no domain)', () => {
    const result = processMessage(ConversationStep.CORREO, 'user@', {});
    expect(result.step).toBe(ConversationStep.CORREO);
  });

  it('advances to ESTADO with valid email', () => {
    const result = processMessage(ConversationStep.CORREO, 'user@example.com', {});
    expect(result.step).toBe(ConversationStep.ESTADO);
    expect(result.profile.correo).toBe('user@example.com');
  });
});

describe('processMessage — ESTADO validation', () => {
  it('stays on ESTADO with invalid state', () => {
    const result = processMessage(ConversationStep.ESTADO, 'Narnia', {});
    expect(result.step).toBe(ConversationStep.ESTADO);
    expect(result.message).toContain('estado');
  });

  it('advances to CIUDAD with valid state', () => {
    const result = processMessage(ConversationStep.ESTADO, 'Nuevo León', {});
    expect(result.step).toBe(ConversationStep.CIUDAD);
    expect(result.profile.estado).toBe('Nuevo León');
  });

  it('matches state case-insensitively', () => {
    const result = processMessage(ConversationStep.ESTADO, 'jalisco', {});
    expect(result.step).toBe(ConversationStep.CIUDAD);
    expect(result.profile.estado).toBe('Jalisco');
  });
});

describe('processMessage — INGRESO skip flow', () => {
  it('skips to RAMO when user says "no"', () => {
    const result = processMessage(ConversationStep.INGRESO, 'no', {});
    expect(result.step).toBe(ConversationStep.RAMO);
    expect(result.profile.ingresoMensual).toBeNull();
    expect(result.profile.nse).toBeNull();
    expect(result.options).toBeDefined();
  });

  it('skips to RAMO when user says "prefiero no decir"', () => {
    const result = processMessage(ConversationStep.INGRESO, 'prefiero no decir', {});
    expect(result.step).toBe(ConversationStep.RAMO);
    expect(result.profile.ingresoMensual).toBeNull();
  });

  it('INGRESO_SKIP transitions to RAMO automatically', () => {
    const result = processMessage(ConversationStep.INGRESO_SKIP, '', {});
    expect(result.step).toBe(ConversationStep.RAMO);
    expect(result.profile.ingresoMensual).toBeNull();
    expect(result.profile.nse).toBeNull();
  });
});

describe('processMessage — RAMO_INFERIR flow', () => {
  it('goes to RAMO_INFERIR when user says "no sé"', () => {
    const result = processMessage(ConversationStep.RAMO, 'no sé', {});
    expect(result.step).toBe(ConversationStep.RAMO_INFERIR);
  });

  it('infers VidaProtección from "proteger a mi familia"', () => {
    const result = processMessage(ConversationStep.RAMO_INFERIR, 'proteger a mi familia', {});
    expect(result.step).toBe(ConversationStep.RESUMEN);
    expect(result.profile.ramoSeguro).toBe('VidaProtección');
  });

  it('infers GMM from "gastos médicos"', () => {
    const result = processMessage(ConversationStep.RAMO_INFERIR, 'cubrir gastos médicos', {});
    expect(result.step).toBe(ConversationStep.RESUMEN);
    expect(result.profile.ramoSeguro).toBe('GMM');
  });

  it('infers VidaAhorro from "ahorrar para el futuro"', () => {
    const result = processMessage(ConversationStep.RAMO_INFERIR, 'ahorrar para el futuro', {});
    expect(result.step).toBe(ConversationStep.RESUMEN);
    expect(result.profile.ramoSeguro).toBe('VidaAhorro');
  });

  it('stays on RAMO_INFERIR if concern is not recognized', () => {
    const result = processMessage(ConversationStep.RAMO_INFERIR, 'no estoy seguro', {});
    expect(result.step).toBe(ConversationStep.RAMO_INFERIR);
  });
});

describe('processMessage — CORRECCION flow', () => {
  const fullProfile: Partial<ProspectProfile> = {
    nombreCompleto: 'María López',
    telefono: '5512345678',
    correo: 'maria@test.com',
    estado: 'Jalisco',
    ciudad: 'Guadalajara',
    colonia: 'Centro',
    codigoPostal: '44100',
    ingresoMensual: '$41,200 - $78,700',
    nse: 'C+',
    ramoSeguro: 'GMM',
  };

  it('goes to CORRECCION when user says "no" at RESUMEN', () => {
    const result = processMessage(ConversationStep.RESUMEN, 'no', fullProfile);
    expect(result.step).toBe(ConversationStep.CORRECCION);
  });

  it('corrects nombre and returns to RESUMEN', () => {
    const result = processMessage(ConversationStep.CORRECCION, 'nombre: Ana García', fullProfile);
    expect(result.step).toBe(ConversationStep.RESUMEN);
    expect(result.profile.nombreCompleto).toBe('Ana García');
    // Other fields preserved
    expect(result.profile.telefono).toBe('5512345678');
    expect(result.profile.correo).toBe('maria@test.com');
    expect(result.profile.estado).toBe('Jalisco');
    expect(result.profile.ciudad).toBe('Guadalajara');
    expect(result.profile.ramoSeguro).toBe('GMM');
  });

  it('corrects telefono and preserves other fields', () => {
    const result = processMessage(ConversationStep.CORRECCION, 'teléfono: 5598765432', fullProfile);
    expect(result.step).toBe(ConversationStep.RESUMEN);
    expect(result.profile.telefono).toBe('5598765432');
    expect(result.profile.nombreCompleto).toBe('María López');
  });

  it('corrects correo and preserves other fields', () => {
    const result = processMessage(ConversationStep.CORRECCION, 'correo: new@email.com', fullProfile);
    expect(result.step).toBe(ConversationStep.RESUMEN);
    expect(result.profile.correo).toBe('new@email.com');
    expect(result.profile.nombreCompleto).toBe('María López');
  });

  it('stays on CORRECCION if field is not recognized', () => {
    const result = processMessage(ConversationStep.CORRECCION, 'algo raro', fullProfile);
    expect(result.step).toBe(ConversationStep.CORRECCION);
  });

  it('handles direct correction at RESUMEN step', () => {
    const result = processMessage(ConversationStep.RESUMEN, 'nombre: Pedro Ruiz', fullProfile);
    expect(result.step).toBe(ConversationStep.RESUMEN);
    expect(result.profile.nombreCompleto).toBe('Pedro Ruiz');
    expect(result.profile.telefono).toBe('5512345678');
  });
});

describe('processMessage — COLONIA_CP validation', () => {
  it('stays on COLONIA_CP with invalid format (no comma)', () => {
    const result = processMessage(ConversationStep.COLONIA_CP, 'Centro 44100', {});
    expect(result.step).toBe(ConversationStep.COLONIA_CP);
  });

  it('stays on COLONIA_CP with invalid CP (not 5 digits)', () => {
    const result = processMessage(ConversationStep.COLONIA_CP, 'Centro, 123', {});
    expect(result.step).toBe(ConversationStep.COLONIA_CP);
  });

  it('advances to INGRESO with valid colonia and CP', () => {
    const result = processMessage(ConversationStep.COLONIA_CP, 'Del Valle, 03100', {});
    expect(result.step).toBe(ConversationStep.INGRESO);
    expect(result.profile.colonia).toBe('Del Valle');
    expect(result.profile.codigoPostal).toBe('03100');
  });
});

describe('processMessage — NOMBRE validation', () => {
  it('stays on NOMBRE with empty input', () => {
    const result = processMessage(ConversationStep.NOMBRE, '', {});
    expect(result.step).toBe(ConversationStep.NOMBRE);
  });

  it('stays on NOMBRE with whitespace-only input', () => {
    const result = processMessage(ConversationStep.NOMBRE, '   ', {});
    expect(result.step).toBe(ConversationStep.NOMBRE);
  });
});

describe('processMessage — API-handled steps', () => {
  it('returns same step for ASIGNACION', () => {
    const result = processMessage(ConversationStep.ASIGNACION, 'test', {});
    expect(result.step).toBe(ConversationStep.ASIGNACION);
  });

  it('returns same step for CIERRE', () => {
    const result = processMessage(ConversationStep.CIERRE, 'test', {});
    expect(result.step).toBe(ConversationStep.CIERRE);
  });
});
