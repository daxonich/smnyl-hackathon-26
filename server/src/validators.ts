/**
 * Validadores de input para el flujo conversacional.
 * Usados por el Flow Engine para validar datos del prospecto.
 */

/**
 * Valida que el input sea exactamente 10 dígitos numéricos.
 * Se eliminan espacios antes de validar.
 */
export function validateTelefono(input: string): boolean {
  return /^\d{10}$/.test(input.replace(/\s/g, ''));
}

/**
 * Valida que el input tenga formato de correo electrónico (usuario@dominio.ext).
 */
export function validateCorreo(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

/**
 * Valida que el input sea exactamente 5 dígitos numéricos.
 * Se hace trim antes de validar.
 */
export function validateCodigoPostal(input: string): boolean {
  return /^\d{5}$/.test(input.trim());
}
