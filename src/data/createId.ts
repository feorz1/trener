let sequence = 0;

export function createId(prefix: string) {
  sequence += 1;
  const entropy = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}-${entropy}`;
}

