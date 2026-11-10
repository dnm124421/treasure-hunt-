export function normalizeCode(input) {
  if (!input || typeof input !== 'string') return '';
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function formatCode(input) {
  const norm = normalizeCode(input);
  if (norm.length > 3) {
    return norm.slice(0, 3) + '-' + norm.slice(3, 7);
  }
  return norm;
}

