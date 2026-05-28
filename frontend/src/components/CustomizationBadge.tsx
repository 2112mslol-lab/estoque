import { parseBorderType } from '../types/parseBorder';

export function CustomizationBadge({ text }: { text?: string | null }) {
  if (!text) return null;

  const { border, rest } = parseBorderType(text);

  // Extrair cor se houver
  const hexMatch = rest.match(/#([0-9A-Fa-f]{6})\b/);
  const hex = hexMatch ? hexMatch[0] : null;

  // Remover a palavra "Cor: #hex" ou "#hex" do texto restante
  let cleanRest = rest;
  if (hex) {
    cleanRest = cleanRest.replace(new RegExp(`Cor:\\s*${hex}`, 'i'), '').trim();
    cleanRest = cleanRest.replace(hex, '').trim();
    cleanRest = cleanRest.replace(/^\|\s*/, '').replace(/\s*\|\s*$/, '').replace(/\s*\|\s*\|\s*/g, ' | ').trim();
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 4, marginBottom: 6 }}>
      {/* Borda */}
      {border && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: border === 'COM_BORDA' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
          border: border === 'COM_BORDA' ? '1px solid var(--color-warning)' : '1px solid rgba(255,255,255,0.1)',
          color: border === 'COM_BORDA' ? 'var(--color-warning)' : 'var(--color-text-3)',
          padding: '2px 6px', borderRadius: 6, fontSize: 11, fontWeight: 700
        }}>
          {border === 'COM_BORDA' ? '🔲 COM BORDA' : '⬜ SEM BORDA'}
        </div>
      )}

      {/* Cor Visual */}
      {hex && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'var(--color-text-2)',
          padding: '2px 8px 2px 4px', borderRadius: 6, fontSize: 11, fontWeight: 700
        }}>
          <span style={{
            display: 'inline-block', width: 14, height: 14, borderRadius: 4,
            background: hex, border: '1px solid rgba(255,255,255,0.2)'
          }} title={hex} />
          Cor
        </div>
      )}

      {/* Outros Detalhes (Texto livre) */}
      {cleanRest && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.3)',
          color: '#60a5fa',
          padding: '2px 6px', borderRadius: 6, fontSize: 11, fontWeight: 700
        }}>
          {cleanRest}
        </div>
      )}
    </div>
  );
}
