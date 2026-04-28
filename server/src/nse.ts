import { NSE_TABLE, NSE_PRIMA_RANGES } from './constants';

/**
 * Classifies a monthly income into the corresponding NSE level.
 * Checks from highest to lowest: if ingreso >= ingresoMin, it belongs to that level.
 */
export function classifyNSE(ingreso: number): string {
  for (const range of NSE_TABLE) {
    if (ingreso >= range.ingresoMin) {
      return range.nivel;
    }
  }
  return 'E';
}

/**
 * Returns the expected prima range [primaMin, primaMax] for a given NSE level.
 * Throws if the NSE level is not found.
 */
export function getNSEPrimaRange(nse: string): [number, number] {
  const range = NSE_PRIMA_RANGES[nse];
  if (!range) {
    throw new Error(`Nivel NSE no válido: ${nse}`);
  }
  return range;
}
