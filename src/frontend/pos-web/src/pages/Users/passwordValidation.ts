export interface PasswordRequirementStatus {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  symbol: boolean;
}

export const evaluatePassword = (password: string): PasswordRequirementStatus => ({
  length: password.length >= 8,
  uppercase: /\p{Lu}/u.test(password),
  lowercase: /\p{Ll}/u.test(password),
  number: /\p{Nd}/u.test(password),
  symbol: /[^\p{L}\p{N}]/u.test(password)
});

export const isPasswordValid = (password: string) => Object.values(evaluatePassword(password)).every(Boolean);
