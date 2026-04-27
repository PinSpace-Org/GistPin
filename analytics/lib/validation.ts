export type ValidationResult = { valid: true } | { valid: false; error: string };

export function validateRequired(value: string, fieldName = 'Field'): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
}

export function validateMinLength(value: string, min: number, fieldName = 'Field'): ValidationResult {
  if (value.length < min) {
    return { valid: false, error: `${fieldName} must be at least ${min} characters` };
  }
  return { valid: true };
}

export function validateMaxLength(value: string, max: number, fieldName = 'Field'): ValidationResult {
  if (value.length > max) {
    return { valid: false, error: `${fieldName} must be at most ${max} characters` };
  }
  return { valid: true };
}

export function validateEmail(value: string): ValidationResult {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(value)) {
    return { valid: false, error: 'Enter a valid email address' };
  }
  return { valid: true };
}

export function validateUrl(value: string): ValidationResult {
  try {
    new URL(value);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Enter a valid URL' };
  }
}

export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName = 'Value',
): ValidationResult {
  if (value < min || value > max) {
    return { valid: false, error: `${fieldName} must be between ${min} and ${max}` };
  }
  return { valid: true };
}

export function compose(...fns: (() => ValidationResult)[]): ValidationResult {
  for (const fn of fns) {
    const result = fn();
    if (!result.valid) return result;
  }
  return { valid: true };
}
