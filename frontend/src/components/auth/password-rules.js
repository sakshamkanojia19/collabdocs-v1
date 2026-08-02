export const passwordRules = [
  { label: '8+ characters', test: (value) => value.length >= 8 },
  { label: 'Upper & lower case', test: (value) => /[a-z]/.test(value) && /[A-Z]/.test(value) },
  { label: 'A number or symbol', test: (value) => /[^a-zA-Z]/.test(value) }
];

export const isStrongPassword = (value = '') => passwordRules.every((rule) => rule.test(value));
