import { describe, it, expect } from 'vitest';
import { classifyNSE, getNSEPrimaRange } from '../nse';

describe('classifyNSE', () => {
  // Boundary values — exact thresholds
  it('classifies $78,700 as A/B', () => {
    expect(classifyNSE(78700)).toBe('A/B');
  });

  it('classifies $78,699 as C+', () => {
    expect(classifyNSE(78699)).toBe('C+');
  });

  it('classifies $41,200 as C+', () => {
    expect(classifyNSE(41200)).toBe('C+');
  });

  it('classifies $41,199 as C', () => {
    expect(classifyNSE(41199)).toBe('C');
  });

  it('classifies $31,800 as C', () => {
    expect(classifyNSE(31800)).toBe('C');
  });

  it('classifies $31,799 as C−', () => {
    expect(classifyNSE(31799)).toBe('C−');
  });

  it('classifies $21,500 as C−', () => {
    expect(classifyNSE(21500)).toBe('C−');
  });

  it('classifies $21,499 as D+', () => {
    expect(classifyNSE(21499)).toBe('D+');
  });

  it('classifies $15,100 as D+', () => {
    expect(classifyNSE(15100)).toBe('D+');
  });

  it('classifies $15,099 as D', () => {
    expect(classifyNSE(15099)).toBe('D');
  });

  it('classifies $5,600 as D', () => {
    expect(classifyNSE(5600)).toBe('D');
  });

  it('classifies $5,599 as E', () => {
    expect(classifyNSE(5599)).toBe('E');
  });

  // Values within each range
  it('classifies $100,000 as A/B', () => {
    expect(classifyNSE(100000)).toBe('A/B');
  });

  it('classifies $50,000 as C+', () => {
    expect(classifyNSE(50000)).toBe('C+');
  });

  it('classifies $35,000 as C', () => {
    expect(classifyNSE(35000)).toBe('C');
  });

  it('classifies $25,000 as C−', () => {
    expect(classifyNSE(25000)).toBe('C−');
  });

  it('classifies $18,000 as D+', () => {
    expect(classifyNSE(18000)).toBe('D+');
  });

  it('classifies $10,000 as D', () => {
    expect(classifyNSE(10000)).toBe('D');
  });

  it('classifies $3,000 as E', () => {
    expect(classifyNSE(3000)).toBe('E');
  });

  // Edge cases
  it('classifies 0 as E', () => {
    expect(classifyNSE(0)).toBe('E');
  });

  it('classifies very large income as A/B', () => {
    expect(classifyNSE(1_000_000)).toBe('A/B');
  });
});

describe('getNSEPrimaRange', () => {
  it('returns correct range for A/B', () => {
    expect(getNSEPrimaRange('A/B')).toEqual([3_000_000, 6_000_000]);
  });

  it('returns correct range for C+', () => {
    expect(getNSEPrimaRange('C+')).toEqual([1_500_000, 3_000_000]);
  });

  it('returns correct range for C', () => {
    expect(getNSEPrimaRange('C')).toEqual([800_000, 1_500_000]);
  });

  it('returns correct range for C−', () => {
    expect(getNSEPrimaRange('C−')).toEqual([400_000, 800_000]);
  });

  it('returns correct range for D+', () => {
    expect(getNSEPrimaRange('D+')).toEqual([150_000, 400_000]);
  });

  it('returns correct range for D', () => {
    expect(getNSEPrimaRange('D')).toEqual([50_000, 150_000]);
  });

  it('returns correct range for E', () => {
    expect(getNSEPrimaRange('E')).toEqual([12_000, 50_000]);
  });

  it('throws for invalid NSE level', () => {
    expect(() => getNSEPrimaRange('X')).toThrow('Nivel NSE no válido: X');
  });

  it('throws for empty string', () => {
    expect(() => getNSEPrimaRange('')).toThrow('Nivel NSE no válido: ');
  });
});
