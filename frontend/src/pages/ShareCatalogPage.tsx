import { useState, useEffect } from 'react';
import { Share2, Copy, Check, MessageCircle, ExternalLink, QrCode, Phone, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function ShareCatalogPage() {
  const [catalogLink, setCatalogLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [clientPhone, setClientPhone] = useState('');
  const [clientName, setClientName] = useState('');
  const [customMessage, setCustomMessage] = useState(
    'Olá! Segue o link do nosso catálogo online para você escolher os seus produtos e fazer o seu pedido diretamente:\n\n{link}\n\nFicamos no aguardo!'
  );

  const fetchCatalogLink = async () => {
    try {
      const res = await api.get('/configs/catalog-link');
      const linkBackend = res.data.link || '';
      // Se vier do backend a URL antiga do express, construímos a URL baseada no frontend
      const token = linkBackend.split('/').pop() || 'catalogo-toque-ideal-2025';
      const link = `${window.location.origin}/catalogo/${token}`;
      setCatalogLink(link);
    } catch {
      // Fallback
      setCatalogLink(`${window.location.origin}/catalogo/catalogo-toque-ideal-2025`);
    }
  };

  useEffect(() => {
    fetchCatalogLink();
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(catalogLink);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar o link');
    }
  };

  // Formatador de WhatsApp
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setClientPhone(raw);
  };

  const getFormattedMessage = () => {
    let msg = customMessage;
    if (clientName.trim()) {
      msg = `Olá, ${clientName.trim()}! ` + msg.replace(/^Olá!\s*/i, '');
    }
    return msg.replace('{link}', catalogLink);
  };

  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientPhone) {
      toast.error('Por favor, informe o WhatsApp do cliente.');
      return;
    }
    
    // Garantir que tem o DDI (55) se tiver 10 ou 11 dígitos
    let phoneNum = clientPhone;
    if (phoneNum.length === 10 || phoneNum.length === 11) {
      phoneNum = '55' + phoneNum;
    }

    const message = encodeURIComponent(getFormattedMessage());
    const waUrl = `https://wa.me/${phoneNum}?text=${message}`;
    window.open(waUrl, '_blank');
    toast.success('Redirecionando para o WhatsApp...');
  };

  const qrCodeUrl = catalogLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200&200&data=${encodeURIComponent(catalogLink)}`
    : '';

  return (
    <div className="fade-in" style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Share2 size={24} color="var(--color-primary)" />
            Divulgar Catálogo
          </h1>
          <p className="page-subtitle">Compartilhe o catálogo com seus clientes e receba pedidos diretamente no painel</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginTop: 24 }}>
        
        {/* Card Principal do Link */}
        <div className="card shadow-premium" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-1)', marginBottom: 4 }}>Link de Vendas</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>Este é o link público do seu catálogo que você pode enviar para qualquer cliente.</p>
          </div>

          <div style={{ 
            background: 'var(--color-surface-3)', 
            border: '1px solid var(--color-border)', 
            borderRadius: 12, 
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            fontFamily: 'monospace',
            fontSize: 14,
            color: 'var(--color-primary)',
            wordBreak: 'break-all'
          }}>
            {catalogLink}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              className="btn btn-primary" 
              onClick={handleCopy} 
              style={{ flex: 1, justifyContent: 'center', height: 44 }}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copiado!' : 'Copiar Link'}
            </button>
            <a 
              href={catalogLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-secondary" 
              style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', height: 44, display: 'flex', alignItems: 'center' }}
            >
              <ExternalLink size={18} />
              Testar Catálogo
            </a>
          </div>

          <div style={{ 
            marginTop: 10,
            padding: 16, 
            background: 'rgba(59, 130, 246, 0.05)', 
            border: '1px solid rgba(59, 130, 246, 0.15)', 
            borderRadius: 12, 
            fontSize: 13, 
            color: 'var(--color-text-2)', 
            lineHeight: 1.5 
          }}>
            💡 <strong>Como funciona?</strong> O cliente acessa este link, visualiza todas as fotos e características dos itens cadastrados no seu catálogo, monta o carrinho de compras, adiciona observações/medidas e envia o pedido. O pedido cai automaticamente na sua tela de <strong>Lançamento</strong> para você analisar e aprovar!
          </div>
        </div>

        {/* Card do WhatsApp */}
        <div className="card shadow-premium" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-1)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={18} color="#25d366" />
              Enviar pelo WhatsApp
            </h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>Envie uma mensagem personalizada com o link diretamente ao número do cliente.</p>
          </div>

          <form onSubmit={handleSendWhatsApp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Nome do Cliente (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ex: Maria Souza" 
                  className="form-input" 
                  value={clientName} 
                  onChange={e => setClientName(e.target.value)}
                  style={{ marginTop: 0 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>WhatsApp do Cliente (Apenas números)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Phone size={16} color="var(--color-text-3)" style={{ position: 'absolute', left: 14 }} />
                  <input 
                    type="text" 
                    placeholder="Ex: 11999998888" 
                    className="form-input" 
                    value={clientPhone} 
                    onChange={handlePhoneChange}
                    style={{ paddingLeft: 40, marginTop: 0 }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Mensagem Customizada</label>
              <textarea 
                rows={4} 
                className="form-input" 
                value={customMessage} 
                onChange={e => setCustomMessage(e.target.value)}
                style={{ resize: 'vertical', fontSize: 13, lineHeight: 1.5, marginTop: 0 }}
                placeholder="Escreva a mensagem aqui..."
              />
              <span style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4, display: 'block' }}>
                Use <code>{'{link}'}</code> para indicar onde o link do catálogo será inserido.
              </span>
            </div>

            <button 
              type="submit" 
              className="btn" 
              style={{ background: '#25d366', color: 'white', fontWeight: 700, height: 44, justifyContent: 'center' }}
            >
              <MessageCircle size={18} />
              Enviar Catálogo via WhatsApp
            </button>
          </form>
        </div>

        {/* Card do QR Code */}
        <div className="card shadow-premium" style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ width: '100%' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-1)', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <QrCode size={18} color="var(--color-primary)" />
              QR Code do Catálogo
            </h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>Aponte a câmera do celular para abrir o catálogo instantaneamente.</p>
          </div>

          <div style={{
            background: 'white',
            padding: 16,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            border: '4px solid var(--color-surface-3)'
          }}>
            {qrCodeUrl ? (
              <img 
                src={qrCodeUrl} 
                alt="QR Code do Catálogo" 
                style={{ width: 180, height: 180, display: 'block' }} 
              />
            ) : (
              <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                Gerando...
              </div>
            )}
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-2)' }}>
              Excelente para imprimir e deixar no balcão da loja ou colar em embalagens!
            </p>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>QR Code - Catálogo Konnexy</title>
                        <style>
                          body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; background: #fff; color: #000; }
                          h1 { margin-bottom: 5px; }
                          p { color: #666; margin-bottom: 30px; font-size: 18px; }
                          img { width: 300px; height: 300px; border: 1px solid #ccc; padding: 10px; border-radius: 10px; }
                        </style>
                      </head>
                      <body onload="window.print()">
                        <h1>Konnexy</h1>
                        <p>Aponte a câmera para fazer seu pedido pelo catálogo online</p>
                        <img src="${qrCodeUrl}" alt="QR Code" />
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }
              }}
              style={{ justifyContent: 'center', height: 40 }}
            >
              Imprimir QR Code
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
