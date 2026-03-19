import jsPDF from 'jspdf';
import { formatCurrency } from '@/lib/utils';

interface PdfItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface PdfOptions {
  title: string;
  type: 'budget' | 'invoice';
  items: PdfItem[];
  total: number;
  status: string;
  createdAt: string;
  taxes?: number;
  discount?: number;
  dueDate?: string | null;
}

interface OrganizationInfo {
  company_name?: string | null;
  trade_name?: string | null;
  cnpj?: string | null;
  state_registration?: string | null;
  municipal_registration?: string | null;
  business_phone?: string | null;
  business_email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  complement?: string | null;
}

interface ClientInfo {
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  responsible?: string | null;
}

interface BudgetPdfOptions {
  budgetName?: string | null;
  budgetDate?: string | null;
  validityDate?: string | null;
  deliveryDate?: string | null;
  items: PdfItem[];
  total: number;
  discount: number;
  notes?: string | null;
  status: string;
  organization?: OrganizationInfo | null;
  client?: ClientInfo | null;
}

export const loadImageAsBase64 = (url: string): Promise<{ data: string; width: number; height: number } | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve({ data: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight });
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

export const buildOrgAddress = (org: OrganizationInfo): string => {
  const parts: string[] = [];
  if (org.address) parts.push(org.address);
  if (org.complement) parts.push(org.complement);
  if (org.neighborhood) parts.push(org.neighborhood);
  if (org.city && org.state) parts.push(`${org.city} - ${org.state}`);
  else if (org.city) parts.push(org.city);
  else if (org.state) parts.push(org.state);
  if (org.zip_code) parts.push(`CEP: ${org.zip_code}`);
  return parts.join(', ');
};

export const generateBudgetPdf = async (options: BudgetPdfOptions) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pw - margin * 2;
  let y = 14;

  // ── Colors ──
  const BLACK: [number, number, number] = [30, 30, 30];
  const DARK: [number, number, number] = [60, 60, 60];
  const GRAY: [number, number, number] = [110, 110, 110];
  const LIGHT_GRAY: [number, number, number] = [210, 210, 210];
  const BG_LIGHT: [number, number, number] = [248, 248, 250];
  const ACCENT: [number, number, number] = [0, 71, 255];

  // ── Thin top accent line ──
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, pw, 2.5, 'F');

  y = 14;

  // ── Header: Logo + Org info ──
  if (options.organization) {
    const org = options.organization;

    if (org.logo_url) {
      const logoResult = await loadImageAsBase64(org.logo_url);
      if (logoResult) {
        const maxLogoH = 16;
        const maxLogoW = contentW * 0.28;
        const ratio = logoResult.width / logoResult.height;
        let logoW = maxLogoH * ratio;
        let logoH = maxLogoH;
        if (logoW > maxLogoW) { logoW = maxLogoW; logoH = logoW / ratio; }
        doc.addImage(logoResult.data, 'PNG', margin, y, logoW, logoH);
        y = Math.max(y, y + logoH + 3);
      }
    }

    if (!org.logo_url) {
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      doc.text(org.trade_name || org.company_name || 'Empresa', margin, y + 5);
      y += 10;
    }

    // Org contact — right aligned
    const orgInfoX = pw - margin;
    let iy = 14;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);

    if (org.cnpj) { const t = `CNPJ ${org.cnpj}`; doc.text(t, orgInfoX - doc.getTextWidth(t), iy); iy += 4; }
    if (org.business_email) { doc.text(org.business_email, orgInfoX - doc.getTextWidth(org.business_email), iy); iy += 4; }
    if (org.business_phone) { doc.text(org.business_phone, orgInfoX - doc.getTextWidth(org.business_phone), iy); iy += 4; }
    if (org.website) { doc.text(org.website, orgInfoX - doc.getTextWidth(org.website), iy); }

    y = Math.max(y, iy + 4);
  }

  y += 4;

  // ── Thin separator ──
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pw - margin, y);
  y += 10;

  // ── Title ──
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('ORÇAMENTO', margin, y);

  if (options.budgetName) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    const nameW = doc.getTextWidth(options.budgetName);
    doc.text(options.budgetName, pw - margin - nameW, y);
  }
  y += 12;

  // ── Two-column: Details | Client ──
  const colLeftX = margin;
  const colRightX = margin + contentW / 2 + 8;
  const metaStartY = y;

  // Left — Details (light background, no border)
  const detailBlockW = contentW / 2 - 4;
  const detailBlockH = 34;
  doc.setFillColor(...BG_LIGHT);
  doc.roundedRect(colLeftX, y - 4, detailBlockW, detailBlockH, 2, 2, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ACCENT);
  doc.text('DETALHES', colLeftX + 5, y + 2);
  y += 8;

  doc.setFontSize(9.5);
  const addMetaRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(label, colLeftX + 5, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(value, colLeftX + 28, y);
    y += 6;
  };

  if (options.budgetDate) addMetaRow('Data', new Date(options.budgetDate + 'T12:00:00').toLocaleDateString('pt-BR'));
  if (options.validityDate) addMetaRow('Validade', new Date(options.validityDate + 'T12:00:00').toLocaleDateString('pt-BR'));
  if (options.deliveryDate) addMetaRow('Entrega', new Date(options.deliveryDate + 'T12:00:00').toLocaleDateString('pt-BR'));

  // Right — Client (light background, no border)
  if (options.client) {
    const cl = options.client;
    let cy = metaStartY;

    doc.setFillColor(...BG_LIGHT);
    doc.roundedRect(colRightX, cy - 4, contentW / 2 - 4, detailBlockH, 2, 2, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ACCENT);
    doc.text('CLIENTE', colRightX + 5, cy + 2);
    cy += 8;

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    doc.text(cl.name, colRightX + 5, cy);
    cy += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    if (cl.document) { doc.text(cl.document, colRightX + 5, cy); cy += 5; }
    if (cl.email) { doc.text(cl.email, colRightX + 5, cy); cy += 5; }
    if (cl.phone) { doc.text(cl.phone, colRightX + 5, cy); cy += 5; }

    y = Math.max(y, cy);
  }

  y = metaStartY + detailBlockH + 6;

  // ── Items Table ──
  // Header — accent background
  doc.setFillColor(...ACCENT);
  doc.roundedRect(margin, y, contentW, 9, 1, 1, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  const col1 = margin + 4;
  const col2 = margin + 100;
  const col3 = margin + 122;
  const col4 = pw - margin - 4;

  doc.text('#', col1, y + 6.5);
  doc.text('DESCRIÇÃO', col1 + 8, y + 6.5);
  doc.text('QTD', col2, y + 6.5);
  doc.text('VALOR UNIT.', col3, y + 6.5);
  const stH = 'SUBTOTAL';
  doc.text(stH, col4 - doc.getTextWidth(stH), y + 6.5);
  y += 12;

  // Rows
  doc.setFontSize(9.5);
  options.items.forEach((item, idx) => {
    if (y > 250) { doc.addPage(); y = 20; }

    // Alternating subtle bg
    if (idx % 2 === 0) {
      doc.setFillColor(245, 246, 250);
      doc.rect(margin, y - 5, contentW, 10, 'F');
    }

    const sub = item.quantity * item.unitPrice;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(String(idx + 1).padStart(2, '0'), col1, y);
    doc.setTextColor(...DARK);
    doc.text(item.description || '-', col1 + 8, y);
    doc.setTextColor(...GRAY);
    doc.text(String(item.quantity), col2 + 2, y);
    doc.text(formatCurrency(item.unitPrice), col3, y);
    const subText = formatCurrency(sub);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    doc.text(subText, col4 - doc.getTextWidth(subText), y);
    y += 10;
  });

  // Thin table bottom line
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pw - margin, y);
  y += 10;

  // ── Totals ──
  const totalsX = margin + contentW - 75;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);

  const rightAlign = (label: string, val: string) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, totalsX, y);
    const valW = doc.getTextWidth(val);
    doc.text(val, pw - margin - valW, y);
    y += 6;
  };

  const subtotal = options.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  rightAlign('Subtotal', formatCurrency(subtotal));

  if (options.discount > 0) {
    doc.setTextColor(200, 60, 60);
    rightAlign('Desconto', `- ${formatCurrency(options.discount)}`);
  }

  y += 4;

  // Total — accent background, clean
  doc.setFillColor(...ACCENT);
  const totalBlockH = 11;
  doc.roundedRect(totalsX - 4, y - 2, pw - margin - totalsX + 4, totalBlockH, 2, 2, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', totalsX, y + 6.5);
  const totalText = formatCurrency(options.total);
  const totalW = doc.getTextWidth(totalText);
  doc.text(totalText, pw - margin - totalW, y + 6.5);
  y += totalBlockH + 12;

  // ── Notes ──
  if (options.notes) {
    if (y > 225) { doc.addPage(); y = 20; }

    doc.setDrawColor(...LIGHT_GRAY);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pw - margin, y);
    y += 7;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ACCENT);
    doc.text('OBSERVAÇÕES', margin, y);
    y += 6;

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    const noteLines = doc.splitTextToSize(options.notes, contentW);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5 + 4;
  }

  // ── Footer ──
  doc.setFillColor(...ACCENT);
  doc.rect(0, pageH - 2, pw, 2, 'F');

  const footerY = pageH - 10;
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 4, pw - margin, footerY - 4);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);

  if (options.organization) {
    const org = options.organization;
    const companyName = org.company_name || org.trade_name || '';
    const addr = buildOrgAddress(org);
    const footerText = [companyName, addr].filter(Boolean).join('  ·  ');
    if (footerText) {
      const footerLines = doc.splitTextToSize(footerText, contentW - 30);
      doc.text(footerLines[0] || '', margin, footerY);
    }
  }

  if (options.budgetDate) {
    const dateStr = new Date(options.budgetDate + 'T12:00:00').toLocaleDateString('pt-BR');
    const dateW = doc.getTextWidth(dateStr);
    doc.text(dateStr, pw - margin - dateW, footerY);
  }

  const datePart = options.budgetDate || new Date().toISOString().slice(0, 10);
  doc.save(`orcamento_${datePart}.pdf`);
};

interface InvoicePdfOptions {
  invoiceName?: string | null;
  items: PdfItem[];
  total: number;
  taxes: number;
  discount: number;
  status: string;
  dueDate?: string | null;
  paymentMethod?: string | null;
  createdAt: string;
  organization?: OrganizationInfo | null;
  client?: ClientInfo | null;
}

export const generateInvoicePdf = async (options: InvoicePdfOptions) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pw - margin * 2;
  let y = 14;

  const BLACK: [number, number, number] = [30, 30, 30];
  const DARK: [number, number, number] = [60, 60, 60];
  const GRAY: [number, number, number] = [110, 110, 110];
  const LIGHT_GRAY: [number, number, number] = [210, 210, 210];
  const BG_LIGHT: [number, number, number] = [248, 248, 250];
  const ACCENT: [number, number, number] = [0, 71, 255];

  // Thin top accent line
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, pw, 2.5, 'F');
  y = 14;

  // Header
  if (options.organization) {
    const org = options.organization;

    if (org.logo_url) {
      const logoResult = await loadImageAsBase64(org.logo_url);
      if (logoResult) {
        const maxLogoH = 16;
        const maxLogoW = contentW * 0.28;
        const ratio = logoResult.width / logoResult.height;
        let logoW = maxLogoH * ratio;
        let logoH = maxLogoH;
        if (logoW > maxLogoW) { logoW = maxLogoW; logoH = logoW / ratio; }
        doc.addImage(logoResult.data, 'PNG', margin, y, logoW, logoH);
        y = Math.max(y, y + logoH + 3);
      }
    }

    if (!org.logo_url) {
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      doc.text(org.trade_name || org.company_name || 'Empresa', margin, y + 5);
      y += 10;
    }

    const orgInfoX = pw - margin;
    let iy = 14;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    if (org.cnpj) { const t = `CNPJ ${org.cnpj}`; doc.text(t, orgInfoX - doc.getTextWidth(t), iy); iy += 4; }
    if (org.business_email) { doc.text(org.business_email, orgInfoX - doc.getTextWidth(org.business_email), iy); iy += 4; }
    if (org.business_phone) { doc.text(org.business_phone, orgInfoX - doc.getTextWidth(org.business_phone), iy); iy += 4; }
    if (org.website) { doc.text(org.website, orgInfoX - doc.getTextWidth(org.website), iy); }
    y = Math.max(y, iy + 4);
  }

  y += 4;
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pw - margin, y);
  y += 10;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('FATURA', margin, y);

  if (options.invoiceName) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    const nameW = doc.getTextWidth(options.invoiceName);
    doc.text(options.invoiceName, pw - margin - nameW, y);
  }
  y += 12;

  // Two-column
  const colLeftX = margin;
  const colRightX = margin + contentW / 2 + 8;
  const metaStartY = y;
  const detailBlockW = contentW / 2 - 4;
  const detailBlockH = 38;

  doc.setFillColor(...BG_LIGHT);
  doc.roundedRect(colLeftX, y - 4, detailBlockW, detailBlockH, 2, 2, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ACCENT);
  doc.text('DETALHES', colLeftX + 5, y + 2);
  y += 8;

  doc.setFontSize(9.5);
  const addMetaRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(label, colLeftX + 5, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(value, colLeftX + 32, y);
    y += 6;
  };

  addMetaRow('Status', options.status);
  addMetaRow('Data', new Date(options.createdAt).toLocaleDateString('pt-BR'));
  if (options.dueDate) addMetaRow('Vencimento', new Date(options.dueDate + 'T12:00:00').toLocaleDateString('pt-BR'));
  if (options.paymentMethod) addMetaRow('Pagamento', options.paymentMethod);

  if (options.client) {
    const cl = options.client;
    let cy = metaStartY;

    doc.setFillColor(...BG_LIGHT);
    doc.roundedRect(colRightX, cy - 4, contentW / 2 - 4, detailBlockH, 2, 2, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ACCENT);
    doc.text('CLIENTE', colRightX + 5, cy + 2);
    cy += 8;

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    doc.text(cl.name, colRightX + 5, cy);
    cy += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    if (cl.document) { doc.text(cl.document, colRightX + 5, cy); cy += 5; }
    if (cl.email) { doc.text(cl.email, colRightX + 5, cy); cy += 5; }
    if (cl.phone) { doc.text(cl.phone, colRightX + 5, cy); cy += 5; }

    y = Math.max(y, cy);
  }

  y = metaStartY + detailBlockH + 6;

  // Items table
  doc.setFillColor(...ACCENT);
  doc.roundedRect(margin, y, contentW, 9, 1, 1, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  const col1 = margin + 4;
  const col2 = margin + 100;
  const col3 = margin + 122;
  const col4 = pw - margin - 4;

  doc.text('#', col1, y + 6.5);
  doc.text('DESCRIÇÃO', col1 + 8, y + 6.5);
  doc.text('QTD', col2, y + 6.5);
  doc.text('VALOR UNIT.', col3, y + 6.5);
  const stH = 'SUBTOTAL';
  doc.text(stH, col4 - doc.getTextWidth(stH), y + 6.5);
  y += 12;

  doc.setFontSize(9.5);
  options.items.forEach((item, idx) => {
    if (y > 250) { doc.addPage(); y = 20; }
    if (idx % 2 === 0) { doc.setFillColor(245, 246, 250); doc.rect(margin, y - 5, contentW, 10, 'F'); }

    const sub = item.quantity * item.unitPrice;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(String(idx + 1).padStart(2, '0'), col1, y);
    doc.setTextColor(...DARK);
    doc.text(item.description || '-', col1 + 8, y);
    doc.setTextColor(...GRAY);
    doc.text(String(item.quantity), col2 + 2, y);
    doc.text(formatCurrency(item.unitPrice), col3, y);
    const subText = formatCurrency(sub);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    doc.text(subText, col4 - doc.getTextWidth(subText), y);
    y += 10;
  });

  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pw - margin, y);
  y += 10;

  // Totals
  const totalsX = margin + contentW - 75;
  const subtotal = options.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);

  const rightAlign = (label: string, val: string) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, totalsX, y);
    const valW = doc.getTextWidth(val);
    doc.text(val, pw - margin - valW, y);
    y += 6;
  };

  rightAlign('Subtotal', formatCurrency(subtotal));
  if (options.taxes > 0) {
    rightAlign(`Impostos (${options.taxes}%)`, formatCurrency(subtotal * options.taxes / 100));
  }
  if (options.discount > 0) {
    doc.setTextColor(200, 60, 60);
    rightAlign('Desconto', `- ${formatCurrency(options.discount)}`);
  }

  y += 4;
  doc.setFillColor(...ACCENT);
  const totalBlockH = 11;
  doc.roundedRect(totalsX - 4, y - 2, pw - margin - totalsX + 4, totalBlockH, 2, 2, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', totalsX, y + 6.5);
  const totalText = formatCurrency(options.total);
  const totalW = doc.getTextWidth(totalText);
  doc.text(totalText, pw - margin - totalW, y + 6.5);

  // Footer
  doc.setFillColor(...ACCENT);
  doc.rect(0, pageH - 2, pw, 2, 'F');

  const footerY = pageH - 10;
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 4, pw - margin, footerY - 4);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);

  if (options.organization) {
    const org = options.organization;
    const companyName = org.company_name || org.trade_name || '';
    const addr = buildOrgAddress(org);
    const footerText = [companyName, addr].filter(Boolean).join('  ·  ');
    if (footerText) {
      const footerLines = doc.splitTextToSize(footerText, contentW - 30);
      doc.text(footerLines[0] || '', margin, footerY);
    }
  }

  const dateStr = new Date(options.createdAt).toLocaleDateString('pt-BR');
  const dateW = doc.getTextWidth(dateStr);
  doc.text(dateStr, pw - margin - dateW, footerY);

  const datePart = new Date(options.createdAt).toISOString().slice(0, 10);
  doc.save(`fatura_${datePart}.pdf`);
};

export const generateDocumentPdf = (options: PdfOptions) => {
  const doc = new jsPDF();
  const { title, type, items, total, status, createdAt, taxes, discount, dueDate } = options;

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(`Status: ${status}`, 20, 35);
  doc.text(`Data: ${new Date(createdAt).toLocaleDateString('pt-BR')}`, 20, 41);
  if (type === 'invoice' && dueDate) {
    doc.text(`Vencimento: ${dueDate}`, 20, 47);
  }

  const tableTop = type === 'invoice' && dueDate ? 58 : 52;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(245, 245, 245);
  doc.rect(20, tableTop, 170, 8, 'F');
  doc.text('Descrição', 22, tableTop + 5.5);
  doc.text('Qtd', 120, tableTop + 5.5);
  doc.text('Valor Unit.', 140, tableTop + 5.5);
  doc.text('Subtotal', 168, tableTop + 5.5);

  doc.setFont('helvetica', 'normal');
  let y = tableTop + 14;
  items.forEach((item) => {
    const subtotal = item.quantity * item.unitPrice;
    doc.text(item.description || '-', 22, y);
    doc.text(String(item.quantity), 122, y);
    doc.text(formatCurrency(item.unitPrice), 140, y);
    doc.text(formatCurrency(subtotal), 168, y);
    y += 7;
  });

  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(20, y, 190, y);
  y += 8;

  doc.setFontSize(10);
  if (type === 'invoice') {
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    doc.text(`Subtotal: ${formatCurrency(subtotal)}`, 140, y);
    y += 6;
    if (taxes) {
      doc.text(`Impostos (${taxes}%): ${formatCurrency(subtotal * taxes / 100)}`, 140, y);
      y += 6;
    }
    if (discount) {
      doc.text(`Desconto: -${formatCurrency(discount)}`, 140, y);
      y += 6;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total: ${formatCurrency(total)}`, 140, y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.text('Documento gerado automaticamente', 20, 280);

  const filename = `${type === 'budget' ? 'orcamento' : 'fatura'}_${new Date(createdAt).toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
};
