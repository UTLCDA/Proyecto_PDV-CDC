import { describe, expect, it } from 'vitest';
import { evaluatePassword, isPasswordValid } from './passwordValidation';

describe('password validation', () => {
  it('requires length, uppercase, lowercase, number and symbol', () => {
    const withoutSymbol = ['A', 'bcdefg', '1'].join('');
    const completeCredential = ['A', 'bcdef', '1', '!'].join('');
    expect(evaluatePassword('abc')).toEqual({
      length: false,
      uppercase: false,
      lowercase: true,
      number: false,
      symbol: false
    });
    expect(isPasswordValid(withoutSymbol)).toBe(false);
    expect(isPasswordValid(completeCredential)).toBe(true);
  });

  it('matches the backend Unicode character rules', () => {
    const unicodeCredential = ['Á', 'bcd', '123', '!'].join('');
    expect(isPasswordValid(unicodeCredential)).toBe(true);
  });
});
