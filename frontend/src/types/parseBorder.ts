export type BorderType = 'COM_BORDA' | 'SEM_BORDA' | null;

export function parseBorderType(customization?: string | null): { border: BorderType; rest: string } {
  if (!customization) return { border: null, rest: '' };

  const parts = customization.split('|').map(p => p.trim());
  let border: BorderType = null;
  const restParts = [];

  for (const part of parts) {
    if (part === 'COM_BORDA') {
      border = 'COM_BORDA';
    } else if (part === 'SEM_BORDA') {
      border = 'SEM_BORDA';
    } else {
      restParts.push(part);
    }
  }

  return { border, rest: restParts.join(' | ') };
}

export function buildCustomization(border: BorderType, rest: string): string {
  const parts = [];
  if (border) parts.push(border);
  if (rest && rest.trim()) parts.push(rest.trim());
  return parts.join(' | ');
}
