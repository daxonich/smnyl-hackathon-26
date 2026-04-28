import { describe, it, expect } from 'vitest';
import { validateTelefono, validateCorreo, validateCodigoPostal } from '../validators';

describe('validateTelefono', () => {
  it('accepts exactly 10 digits', () => {
    expect(validateTelefono('5512345678')).toBe(true);
  });

  it('accepts 10 digits with spaces (strips them)', () => {
    expect(validateTelefono('55 1234 5678')).toBe(true);
  });

  it('rejects fewer than 10 digits', () => {
    expect(validateTelefono('551234567')).toBe(false);
  });

  it('rejects more than 10 digits', () => {
    expect(validateTelefono('55123456789')).toBe(false);
  });

  it('rejects non-numeric characters', () => {
    expect(validateTelefono('55-1234-5678')).toBe(false);
  });

  it('rejects letters', () => {
    expect(validateTelefono('abcdefghij')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateTelefono('')).toBe(false);
  });

  it('rejects phone with country code prefix', () => {
    expect(validateTelefono('+525512345678')).toBe(false);
  });
});

describe('validateCorreo', () => {
  it('accepts valid email', () => {
    expect(validateCorreo('user@example.com')).toBe(true);
  });

  it('accepts email with subdomain', () => {
    expect(validateCorreo('user@mail.example.com')).toBe(true);
  });

  it('accepts email with dots in local part', () => {
    expect(validateCorreo('first.last@example.com')).toBe(true);
  });

  it('rejects missing @', () => {
    expect(validateCorreo('userexample.com')).toBe(false);
  });

  it('rejects missing domain', () => {
    expect(validateCorreo('user@')).toBe(false);
  });

  it('rejects missing local part', () => {
    expect(validateCorreo('@example.com')).toBe(false);
  });

  it('rejects spaces in email', () => {
    expect(validateCorreo('user @example.com')).toBe(false);
  });

  it('rejects missing extension', () => {
    expect(validateCorreo('user@example')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateCorreo('')).toBe(false);
  });
});

describe('validateCodigoPostal', () => {
  it('accepts exactly 5 digits', () => {
    expect(validateCodigoPostal('44100')).toBe(true);
  });

  it('accepts 5 digits with leading/trailing spaces (trims)', () => {
    expect(validateCodigoPostal('  44100  ')).toBe(true);
  });

  it('rejects fewer than 5 digits', () => {
    expect(validateCodigoPostal('4410')).toBe(false);
  });

  it('rejects more than 5 digits', () => {
    expect(validateCodigoPostal('441001')).toBe(false);
  });

  it('rejects non-numeric characters', () => {
    expect(validateCodigoPostal('44-10')).toBe(false);
  });

  it('rejects letters', () => {
    expect(validateCodigoPostal('abcde')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateCodigoPostal('')).toBe(false);
  });
});
