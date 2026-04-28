import { ConversationStep, ESTADOS_MEXICO, RAMOS, NSE_TABLE } from './constants';
import { validateTelefono, validateCorreo, validateCodigoPostal } from './validators';
import { classifyNSE } from './nse';
import type { ProspectProfile } from './types';

export interface FlowResult {
  message: string;
  step: ConversationStep;
  profile: Partial<ProspectProfile>;
  options?: string[];
}

const INGRESO_OPTIONS = NSE_TABLE.map(
  (r) => `$${r.ingresoMin.toLocaleString('en-US')} - $${r.ingresoMax === Infinity ? 'o más' : r.ingresoMax.toLocaleString('en-US')}`
);

const RAMO_OPTIONS = [...RAMOS];

const RAMO_DESCRIPTIONS: Record<string, string> = {
  VidaProtección: 'Protege económicamente a tu familia ante cualquier eventualidad.',
  GMM: 'Cubre gastos médicos mayores para ti y tu familia.',
  VidaAhorro: 'Combina protección con un componente de ahorro para el futuro.',
};

const CORRECTION_FIELD_MAP: Record<string, keyof ProspectProfile> = {
  nombre: 'nombreCompleto',
  telefono: 'telefono',
  teléfono: 'telefono',
  correo: 'correo',
  email: 'correo',
  estado: 'estado',
  ciudad: 'ciudad',
  colonia: 'colonia',
  'código postal': 'codigoPostal',
  'codigo postal': 'codigoPostal',
  cp: 'codigoPostal',
  ingreso: 'ingresoMensual',
  ramo: 'ramoSeguro',
};

/**
 * Returns the initial welcome message for the chatbot.
 */
export function getWelcomeMessage(): string {
  return '¡Hola! 👋 Soy tu asistente virtual de seguros. Estoy aquí para ayudarte a encontrar al agente de seguros ideal para ti. Para eso, necesito hacerte algunas preguntas sobre tus datos y necesidades. ¿Te gustaría comenzar?';
}

/**
 * Generates a readable summary of the prospect's profile data.
 */
export function generateSummary(profile: Partial<ProspectProfile>): string {
  const lines: string[] = ['📋 *Resumen de tus datos:*'];
  if (profile.nombreCompleto) lines.push(`• Nombre: ${profile.nombreCompleto}`);
  if (profile.telefono) lines.push(`• Teléfono: ${profile.telefono}`);
  if (profile.correo) lines.push(`• Correo: ${profile.correo}`);
  if (profile.estado) lines.push(`• Estado: ${profile.estado}`);
  if (profile.ciudad) lines.push(`• Ciudad: ${profile.ciudad}`);
  if (profile.colonia) lines.push(`• Colonia: ${profile.colonia}`);
  if (profile.codigoPostal) lines.push(`• Código Postal: ${profile.codigoPostal}`);
  if (profile.ingresoMensual !== undefined) {
    lines.push(`• Ingreso mensual: ${profile.ingresoMensual ?? 'No proporcionado'}`);
  }
  if (profile.ramoSeguro) lines.push(`• Tipo de seguro: ${profile.ramoSeguro}`);
  return lines.join('\n');
}

/**
 * Finds the matching Mexican state from ESTADOS_MEXICO (case-insensitive).
 */
function findEstado(input: string): string | null {
  const normalized = input.trim().toLowerCase();
  return ESTADOS_MEXICO.find((e) => e.toLowerCase() === normalized) ?? null;
}

/**
 * Parses "colonia, CP" format from user input.
 * Returns [colonia, codigoPostal] or null if parsing fails.
 */
function parseColoniaCP(input: string): [string, string] | null {
  const parts = input.split(',').map((p) => p.trim());
  if (parts.length >= 2) {
    const colonia = parts.slice(0, -1).join(', ').trim();
    const cp = parts[parts.length - 1].trim();
    if (colonia && cp) return [colonia, cp];
  }
  return null;
}

/**
 * Checks if user input indicates they don't want to provide income.
 */
function isIngresoSkip(input: string): boolean {
  const lower = input.toLowerCase().trim();
  return (
    lower === 'no' ||
    lower.includes('prefiero no') ||
    lower.includes('no deseo') ||
    lower.includes('no quiero') ||
    lower.includes('omitir') ||
    lower.includes('saltar')
  );
}

/**
 * Checks if user input indicates they don't know which ramo to choose.
 */
function isRamoUnknown(input: string): boolean {
  const lower = input.toLowerCase().trim();
  return (
    lower.includes('no sé') ||
    lower.includes('no se') ||
    lower.includes('no lo sé') ||
    lower.includes('no estoy seguro') ||
    lower.includes('no conozco')
  );
}

/**
 * Infers the ramo from user's concerns about their needs.
 */
function inferRamo(input: string): string | null {
  const lower = input.toLowerCase();
  if (lower.includes('familia') || lower.includes('proteger') || lower.includes('protección') || lower.includes('fallecimiento')) {
    return 'VidaProtección';
  }
  if (lower.includes('médico') || lower.includes('medico') || lower.includes('hospital') || lower.includes('salud') || lower.includes('gastos médicos') || lower.includes('enfermedad')) {
    return 'GMM';
  }
  if (lower.includes('ahorro') || lower.includes('ahorrar') || lower.includes('futuro') || lower.includes('inversión') || lower.includes('inversion') || lower.includes('retiro')) {
    return 'VidaAhorro';
  }
  return null;
}

/**
 * Matches an income option string to the NSE_TABLE entry.
 * Returns the matched range string and the NSE level, or null.
 */
function matchIngresoOption(input: string): { rangeLabel: string; nse: string } | null {
  const lower = input.toLowerCase().replace(/[\s,$]/g, '');
  for (const range of NSE_TABLE) {
    const optionLower = `$${range.ingresoMin.toLocaleString('en-US')} - $${range.ingresoMax === Infinity ? 'o más' : range.ingresoMax.toLocaleString('en-US')}`.toLowerCase().replace(/[\s,$]/g, '');
    if (lower === optionLower || lower.includes(range.ingresoMin.toString())) {
      const label = `$${range.ingresoMin.toLocaleString('en-US')} - $${range.ingresoMax === Infinity ? 'o más' : range.ingresoMax.toLocaleString('en-US')}`;
      const midpoint = range.ingresoMax === Infinity ? range.ingresoMin : (range.ingresoMin + range.ingresoMax) / 2;
      return { rangeLabel: label, nse: classifyNSE(midpoint) };
    }
  }
  return null;
}

/**
 * Checks if user confirms (e.g., "sí", "confirmar", "correcto").
 */
function isConfirmation(input: string): boolean {
  const lower = input.toLowerCase().trim();
  return (
    lower === 'sí' ||
    lower === 'si' ||
    lower === 'confirmar' ||
    lower === 'confirmo' ||
    lower === 'correcto' ||
    lower === 'ok' ||
    lower === 'está bien' ||
    lower === 'esta bien' ||
    lower === 'todo bien'
  );
}

/**
 * Checks if user wants to correct something in the summary.
 */
function isCorrection(input: string): boolean {
  const lower = input.toLowerCase().trim();
  return (
    lower === 'no' ||
    lower.includes('corregir') ||
    lower.includes('cambiar') ||
    lower.includes('modificar') ||
    lower.includes('incorrecto') ||
    lower.includes('mal')
  );
}

/**
 * Parses a correction request to identify the field and new value.
 * Expected formats: "nombre: Juan Pérez" or "corregir nombre Juan Pérez"
 */
function parseCorrection(input: string, profile: Partial<ProspectProfile>): { field: keyof ProspectProfile; value: string } | null {
  // Try "field: value" format
  const colonMatch = input.match(/^(.+?):\s*(.+)$/);
  if (colonMatch) {
    const fieldKey = colonMatch[1].trim().toLowerCase();
    const value = colonMatch[2].trim();
    const profileField = CORRECTION_FIELD_MAP[fieldKey];
    if (profileField && value) return { field: profileField, value };
  }

  // Try to find a known field name in the input
  for (const [keyword, profileField] of Object.entries(CORRECTION_FIELD_MAP)) {
    if (input.toLowerCase().includes(keyword)) {
      // Extract value after the keyword
      const idx = input.toLowerCase().indexOf(keyword);
      const afterKeyword = input.slice(idx + keyword.length).replace(/^[\s:]+/, '').trim();
      if (afterKeyword) return { field: profileField, value: afterKeyword };
    }
  }

  return null;
}

/**
 * Matches a ramo option from user input.
 */
function matchRamo(input: string): string | null {
  const lower = input.toLowerCase().trim();
  for (const ramo of RAMOS) {
    if (lower === ramo.toLowerCase() || lower.includes(ramo.toLowerCase())) {
      return ramo;
    }
  }
  // Also match partial/common names
  if (lower.includes('vida') && lower.includes('protec')) return 'VidaProtección';
  if (lower.includes('gmm') || lower.includes('gastos') || lower.includes('médicos') || lower.includes('medicos')) return 'GMM';
  if (lower.includes('vida') && lower.includes('ahorro')) return 'VidaAhorro';
  return null;
}

/**
 * Main flow engine: processes a user message given the current step and profile,
 * returning the next step, updated profile, response message, and optional options.
 */
export function processMessage(
  currentStep: ConversationStep,
  input: string,
  profile: Partial<ProspectProfile>
): FlowResult {
  const trimmed = input.trim();
  const updatedProfile = { ...profile };

  switch (currentStep) {
    case ConversationStep.WELCOME: {
      return {
        message: '¡Perfecto! Comencemos. ¿Cuál es tu nombre completo?',
        step: ConversationStep.NOMBRE,
        profile: updatedProfile,
      };
    }

    case ConversationStep.NOMBRE: {
      if (!trimmed) {
        return {
          message: 'Necesito tu nombre completo para continuar. ¿Podrías proporcionármelo?',
          step: ConversationStep.NOMBRE,
          profile: updatedProfile,
        };
      }
      updatedProfile.nombreCompleto = trimmed;
      return {
        message: `Gracias, ${trimmed}. ¿Cuál es tu número de teléfono? (10 dígitos)`,
        step: ConversationStep.TELEFONO,
        profile: updatedProfile,
      };
    }

    case ConversationStep.TELEFONO: {
      const cleaned = trimmed.replace(/\s/g, '');
      if (!validateTelefono(cleaned)) {
        return {
          message: 'El número de teléfono debe tener exactamente 10 dígitos. Por favor, inténtalo de nuevo.',
          step: ConversationStep.TELEFONO,
          profile: updatedProfile,
        };
      }
      updatedProfile.telefono = cleaned;
      return {
        message: '¡Gracias! Ahora, ¿cuál es tu dirección de correo electrónico?',
        step: ConversationStep.CORREO,
        profile: updatedProfile,
      };
    }

    case ConversationStep.CORREO: {
      if (!validateCorreo(trimmed)) {
        return {
          message: 'El formato del correo no parece correcto. ¿Podrías verificarlo?',
          step: ConversationStep.CORREO,
          profile: updatedProfile,
        };
      }
      updatedProfile.correo = trimmed;
      return {
        message: '¿En qué estado de la República Mexicana resides?',
        step: ConversationStep.ESTADO,
        profile: updatedProfile,
      };
    }

    case ConversationStep.ESTADO: {
      const estado = findEstado(trimmed);
      if (!estado) {
        return {
          message: 'No reconozco ese estado. Por favor, proporciona un estado válido de la República Mexicana.',
          step: ConversationStep.ESTADO,
          profile: updatedProfile,
        };
      }
      updatedProfile.estado = estado;
      return {
        message: `${estado}, ¡excelente! ¿Cuál es tu ciudad o municipio?`,
        step: ConversationStep.CIUDAD,
        profile: updatedProfile,
      };
    }

    case ConversationStep.CIUDAD: {
      if (!trimmed) {
        return {
          message: 'Necesito saber tu ciudad o municipio. ¿Podrías indicármelo?',
          step: ConversationStep.CIUDAD,
          profile: updatedProfile,
        };
      }
      updatedProfile.ciudad = trimmed;
      return {
        message: '¿Cuál es tu colonia y código postal? (formato: Colonia, 12345)',
        step: ConversationStep.COLONIA_CP,
        profile: updatedProfile,
      };
    }

    case ConversationStep.COLONIA_CP: {
      const parsed = parseColoniaCP(trimmed);
      if (!parsed) {
        return {
          message: 'Por favor, proporciona tu colonia y código postal en el formato: Colonia, 12345',
          step: ConversationStep.COLONIA_CP,
          profile: updatedProfile,
        };
      }
      const [colonia, cp] = parsed;
      if (!validateCodigoPostal(cp)) {
        return {
          message: 'El código postal debe tener exactamente 5 dígitos. Por favor, inténtalo de nuevo con el formato: Colonia, 12345',
          step: ConversationStep.COLONIA_CP,
          profile: updatedProfile,
        };
      }
      updatedProfile.colonia = colonia;
      updatedProfile.codigoPostal = cp;
      return {
        message: '¿Cuál es tu ingreso mensual aproximado? Selecciona una de las opciones, o escribe "no" si prefieres no proporcionarlo.',
        step: ConversationStep.INGRESO,
        profile: updatedProfile,
        options: INGRESO_OPTIONS,
      };
    }

    case ConversationStep.INGRESO: {
      if (isIngresoSkip(trimmed)) {
        updatedProfile.ingresoMensual = null;
        updatedProfile.nse = null;
        const ramoMsg = '¿Qué tipo de seguro estás buscando?\n\n' +
          RAMOS.map((r) => `• *${r}*: ${RAMO_DESCRIPTIONS[r]}`).join('\n');
        return {
          message: 'Entendido, continuaremos sin ese dato. ' + ramoMsg,
          step: ConversationStep.RAMO,
          profile: updatedProfile,
          options: [...RAMO_OPTIONS],
        };
      }
      const matched = matchIngresoOption(trimmed);
      if (!matched) {
        return {
          message: 'No pude identificar el rango de ingreso. Por favor, selecciona una de las opciones proporcionadas.',
          step: ConversationStep.INGRESO,
          profile: updatedProfile,
          options: INGRESO_OPTIONS,
        };
      }
      updatedProfile.ingresoMensual = matched.rangeLabel;
      updatedProfile.nse = matched.nse;
      const ramoMsg = '¿Qué tipo de seguro estás buscando?\n\n' +
        RAMOS.map((r) => `• *${r}*: ${RAMO_DESCRIPTIONS[r]}`).join('\n');
      return {
        message: '¡Gracias! ' + ramoMsg,
        step: ConversationStep.RAMO,
        profile: updatedProfile,
        options: [...RAMO_OPTIONS],
      };
    }

    case ConversationStep.INGRESO_SKIP: {
      updatedProfile.ingresoMensual = null;
      updatedProfile.nse = null;
      const ramoMsg = '¿Qué tipo de seguro estás buscando?\n\n' +
        RAMOS.map((r) => `• *${r}*: ${RAMO_DESCRIPTIONS[r]}`).join('\n');
      return {
        message: ramoMsg,
        step: ConversationStep.RAMO,
        profile: updatedProfile,
        options: [...RAMO_OPTIONS],
      };
    }

    case ConversationStep.RAMO: {
      if (isRamoUnknown(trimmed)) {
        return {
          message: 'No te preocupes, te ayudo a identificarlo. ¿Cuál es tu principal preocupación?\n\n• Proteger a mi familia\n• Cubrir gastos médicos\n• Ahorrar para el futuro',
          step: ConversationStep.RAMO_INFERIR,
          profile: updatedProfile,
        };
      }
      const ramo = matchRamo(trimmed);
      if (!ramo) {
        return {
          message: 'No reconozco esa opción. Por favor, selecciona uno de los ramos disponibles: VidaProtección, GMM o VidaAhorro.',
          step: ConversationStep.RAMO,
          profile: updatedProfile,
          options: [...RAMO_OPTIONS],
        };
      }
      updatedProfile.ramoSeguro = ramo;
      const summary = generateSummary(updatedProfile);
      return {
        message: `${summary}\n\n¿Los datos son correctos? Escribe "sí" para confirmar o indica qué dato deseas corregir.`,
        step: ConversationStep.RESUMEN,
        profile: updatedProfile,
      };
    }

    case ConversationStep.RAMO_INFERIR: {
      const inferred = inferRamo(trimmed);
      if (!inferred) {
        return {
          message: 'No pude identificar tu necesidad. ¿Podrías indicarme si te preocupa más proteger a tu familia, cubrir gastos médicos o ahorrar para el futuro?',
          step: ConversationStep.RAMO_INFERIR,
          profile: updatedProfile,
        };
      }
      updatedProfile.ramoSeguro = inferred;
      const summary = generateSummary(updatedProfile);
      return {
        message: `Basándome en tu respuesta, te recomiendo *${inferred}*.\n\n${summary}\n\n¿Los datos son correctos? Escribe "sí" para confirmar o indica qué dato deseas corregir.`,
        step: ConversationStep.RESUMEN,
        profile: updatedProfile,
      };
    }

    case ConversationStep.RESUMEN: {
      if (isConfirmation(trimmed)) {
        return {
          message: '¡Perfecto! Buscando al agente ideal para ti...',
          step: ConversationStep.ASIGNACION,
          profile: updatedProfile,
        };
      }
      if (isCorrection(trimmed)) {
        return {
          message: '¿Qué dato deseas corregir? Escribe el campo y el nuevo valor, por ejemplo: "nombre: Juan Pérez"',
          step: ConversationStep.CORRECCION,
          profile: updatedProfile,
        };
      }
      // Try to parse as a direct correction
      const directCorrection = parseCorrection(trimmed, updatedProfile);
      if (directCorrection) {
        (updatedProfile as Record<string, unknown>)[directCorrection.field] = directCorrection.value;
        const summary = generateSummary(updatedProfile);
        return {
          message: `Dato actualizado.\n\n${summary}\n\n¿Los datos son correctos ahora?`,
          step: ConversationStep.RESUMEN,
          profile: updatedProfile,
        };
      }
      return {
        message: 'Por favor, confirma tus datos escribiendo "sí" o indica qué dato deseas corregir.',
        step: ConversationStep.RESUMEN,
        profile: updatedProfile,
      };
    }

    case ConversationStep.CORRECCION: {
      const correction = parseCorrection(trimmed, updatedProfile);
      if (!correction) {
        return {
          message: 'No pude identificar el campo a corregir. Por favor, escribe el campo y el nuevo valor, por ejemplo: "nombre: Juan Pérez"',
          step: ConversationStep.CORRECCION,
          profile: updatedProfile,
        };
      }
      (updatedProfile as Record<string, unknown>)[correction.field] = correction.value;
      const summary = generateSummary(updatedProfile);
      return {
        message: `Dato actualizado.\n\n${summary}\n\n¿Los datos son correctos ahora?`,
        step: ConversationStep.RESUMEN,
        profile: updatedProfile,
      };
    }

    // These steps are handled by the API layer, not the flow engine directly.
    // The flow engine provides a passthrough for them.
    case ConversationStep.ASIGNACION:
    case ConversationStep.RESULTADO:
    case ConversationStep.SIN_AGENTE:
    case ConversationStep.REASIGNACION:
    case ConversationStep.CIERRE: {
      return {
        message: '',
        step: currentStep,
        profile: updatedProfile,
      };
    }

    default: {
      return {
        message: 'Ocurrió un error inesperado. Por favor, intenta de nuevo.',
        step: currentStep,
        profile: updatedProfile,
      };
    }
  }
}
