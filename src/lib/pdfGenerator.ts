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
  deliveryText?: string | null;
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

export const sanitizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .replace(/[\u2022\u25CF\u25E6\u2023\u2043\u2219]/g, '-') // Bullets
    .replace(/[\u2018\u2019\u00B4\u0060]/g, "'") // Single quotes
    .replace(/[\u201C\u201D]/g, '"') // Double quotes
    .replace(/[\u2013\u2014]/g, '-') // Dashes
    .replace(/\u2026/g, '...') // Ellipsis
    .replace(/\u00A0/g, ' '); // Non-breaking space
};

export const generateBudgetPdf = async (options: BudgetPdfOptions) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pw - margin * 2;
  let y = 15;

  // ── Colors & Styles ──
  const BLACK: [number, number, number] = [20, 20, 25];
  const DARK: [number, number, number] = [50, 50, 60];
  const GRAY: [number, number, number] = [100, 100, 115];
  const LIGHT_GRAY: [number, number, number] = [225, 225, 235];
  const BG_LIGHT: [number, number, number] = [250, 251, 254];
  const ACCENT: [number, number, number] = [0, 82, 255]; // Vivid blue

  // ── Header: Org info + Logo ──
  if (options.organization) {
    const org = options.organization;

    // Org info — LEFT aligned
    let iy = y + 2;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    const companyTitle = org.company_name || org.trade_name || '';
    if (companyTitle) {
      doc.text(companyTitle.toUpperCase(), margin, iy);
      iy += 4.5;
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    if (org.cnpj) { doc.text(`CNPJ: ${org.cnpj}`, margin, iy); iy += 4; }
    if (org.business_email) { doc.text(org.business_email, margin, iy); iy += 4; }
    if (org.business_phone) { doc.text(org.business_phone, margin, iy); iy += 4; }
    if (org.website) { doc.text(org.website, margin, iy); }

    // Logo — RIGHT aligned
    if (org.logo_url) {
      const logoResult = await loadImageAsBase64(org.logo_url);
      if (logoResult) {
        const maxLogoH = 12; // Slightly smaller MaxLogoH
        const maxLogoW = contentW * 0.3;
        const ratio = logoResult.width / logoResult.height;
        let logoW = maxLogoH * ratio;
        let logoH = maxLogoH;
        if (logoW > maxLogoW) { logoW = maxLogoW; logoH = logoW / ratio; }
        doc.addImage(logoResult.data, 'PNG', pw - margin - logoW, y, logoW, logoH);
      }
    } else if (org.trade_name || org.company_name) {
       // Placeholder if no logo: name on the right? 
       // User explicitly said logo on right, so if no logo, we keep the right side empty or mirror the title.
       // Let's just leave it empty if no logo as requested.
    }
    
    y = Math.max(y + 22, iy + 10);
  } else {
    y += 10;
  }

  // ── Main Header ──
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  
  const titleText = options.budgetName 
    ? `ORÇAMENTO - ${options.budgetName.toUpperCase()}`
    : 'ORÇAMENTO';
    
  doc.text(titleText, pw / 2, y + 6, { align: 'center' });
  y += 22; // Increased gap after title

  // ── Info Blocks: Client & Details ──
  const colW = (contentW - 10) / 2;
  const blockH = 36; // More compact height
  const startY = y;

  // Unified border/line style for blocks
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.05); // Thinner line

  // Client Block
  if (options.client) {
    const cl = options.client;
    doc.roundedRect(margin, y, colW, blockH, 1.5, 1.5, 'S');
    
    let subY = y + 6;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ACCENT);
    doc.text('CLIENTE', margin + 6, subY);
    subY += 6;

    doc.setFontSize(11); // Slightly smaller name
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    doc.text(cl.name, margin + 6, subY);
    subY += 6;

    doc.setFontSize(8.5); // Slightly smaller details
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    if (cl.document) { 
      const digits = (cl.document || '').replace(/\D/g, '');
      const docLabel = digits.length > 11 ? 'CNPJ: ' : 'CPF: ';
      doc.text(`${docLabel}${cl.document}`, margin + 6, subY); 
      subY += 4.5; 
    }
    if (cl.email) { doc.text(cl.email, margin + 6, subY); subY += 4.5; }
    if (cl.phone) { doc.text(cl.phone, margin + 6, subY); }
  }

  // Details Block
  doc.roundedRect(margin + colW + 10, y, colW, blockH, 1.5, 1.5, 'S');
  
  let detY = y + 6;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ACCENT);
  doc.text('DADOS DO ORÇAMENTO', margin + colW + 16, detY);
  detY += 8;

  const drawRow = (label: string, value: string, py: number) => {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(label, margin + colW + 16, py);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(value, margin + colW + 36, py);
  };

  if (options.budgetDate) {
    drawRow('Emissão:', new Date(options.budgetDate + 'T12:00:00').toLocaleDateString('pt-BR'), detY);
    detY += 5.5;
  }
  if (options.validityDate) {
    drawRow('Validade:', new Date(options.validityDate + 'T12:00:00').toLocaleDateString('pt-BR'), detY);
    detY += 5.5;
  }
  if (options.deliveryDate && options.deliveryText) {
    drawRow('Entrega:', `${new Date(options.deliveryDate + 'T12:00:00').toLocaleDateString('pt-BR')} (${options.deliveryText})`, detY);
  } else if (options.deliveryDate) {
    drawRow('Entrega:', new Date(options.deliveryDate + 'T12:00:00').toLocaleDateString('pt-BR'), detY);
  } else if (options.deliveryText) {
    drawRow('Entrega:', options.deliveryText, detY);
  }

  y += blockH + 12; // Tighter gap after blocks

  // ── Items Table ──
  doc.setFillColor(...DARK);
  doc.roundedRect(margin, y, contentW, 10, 1.5, 1.5, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  const c1 = margin + 5;
  const c2 = margin + 15;
  const c3 = margin + contentW - 75; // QTD
  const c4 = margin + contentW - 55; // UNIT
  const c5 = margin + contentW - 5;  // TOTAL (Right align)

  doc.text('#', c1, y + 6.5);
  doc.text('DESCRIÇÃO', c2, y + 6.5);
  doc.text('QTD', c3, y + 6.5);
  doc.text('VALOR UNIT.', c4, y + 6.5);
  const stH = 'SUBTOTAL';
  doc.text(stH, c5 - doc.getTextWidth(stH), y + 6.5);
  y += 15;

  // Table Rows
  doc.setFontSize(9);
  options.items.forEach((item, idx) => {
    const descW = c3 - c2 - 10;
    const wrappedDesc = doc.splitTextToSize(sanitizeText(item.description) || '-', descW);
    const rowH = Math.max(10, wrappedDesc.length * 5 + 4);

    if (y + rowH > pageH - 30) {
      doc.addPage();
      y = 20;
    }

    // Border bottom
    doc.setDrawColor(...LIGHT_GRAY);
    doc.setLineWidth(0.1);
    doc.line(margin, y + rowH - 5, pw - margin, y + rowH - 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(String(idx + 1).padStart(2, '0'), c1, y);
    
    doc.setTextColor(...DARK);
    doc.text(wrappedDesc, c2, y);

    doc.setTextColor(...GRAY);
    doc.text(String(item.quantity), c3 + 2, y);
    doc.text(formatCurrency(item.unitPrice), c4, y);
    
    const sub = item.quantity * item.unitPrice;
    const subText = formatCurrency(sub);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    doc.text(subText, c5 - doc.getTextWidth(subText), y);
    
    y += rowH;
  });

  y += 10;

  // ── Totals Section ──
  if (y > pageH - 60) {
    doc.addPage();
    y = 20;
  }

  const totalsX = margin + contentW - 80;
  y -= 5; // Move totals up
  
  const addTotalRow = (label: string, val: string, isFinal = false, isFirst = false) => {
    // Add thin separator line before each total row, except the first one
    if (!isFirst) {
      doc.setDrawColor(...LIGHT_GRAY);
      doc.setLineWidth(0.1);
      doc.line(totalsX - 5, y - 5, pw - margin, y - 5);
    }

    if (isFinal) {
      y += 4;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...ACCENT);
      doc.text(label, totalsX, y);
      const valW = doc.getTextWidth(val);
      doc.text(val, pw - margin - valW, y);
      y += 10;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      doc.text(label, totalsX, y);
      const valW = doc.getTextWidth(val);
      doc.text(val, pw - margin - valW, y);
      y += 7;
    }
  };

  const subtotalVal = options.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  addTotalRow('Subtotal:', formatCurrency(subtotalVal), false, true);
  
  if (options.discount > 0) {
    const discVal = subtotalVal * (options.discount / 100);
    doc.setTextColor(220, 50, 50);
    addTotalRow(`Desconto (${options.discount}%):`, `- ${formatCurrency(discVal)}`);
  }

  addTotalRow('TOTAL DO ORÇAMENTO:', formatCurrency(options.total), true);

  // ── Notes ──
  if (options.notes) {
    y += 15;
    if (y > pageH - 40) { doc.addPage(); y = 20; }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ACCENT);
    doc.text('OBSERVAÇÕES E TERMOS', margin, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    const noteLines = doc.splitTextToSize(sanitizeText(options.notes), contentW);
    
    // Pagination logic for notes
    noteLines.forEach((line: string) => {
      if (y > pageH - 25) { 
        doc.addPage(); 
        y = 20; 
      }
      doc.text(line, margin, y);
      y += 4.5;
    });
  }

  // ── Footer ──
  const footerY = pageH - 15;
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pw - margin, footerY - 5);

  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  
  const footerLeft = options.organization?.trade_name || options.organization?.company_name || '';
  if (footerLeft) doc.text(footerLeft, margin, footerY);

  const website = options.organization?.website || '';
  if (website) doc.text(website, pw / 2 - doc.getTextWidth(website) / 2, footerY);

  const footerRight = 'Gerado por Freelance Hub';
  doc.text(footerRight, pw - margin - doc.getTextWidth(footerRight), footerY);

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
  const margin = 20;
  const contentW = pw - margin * 2;
  let y = 15;

  // ── Colors & Styles ──
  const BLACK: [number, number, number] = [20, 20, 25];
  const DARK: [number, number, number] = [50, 50, 60];
  const GRAY: [number, number, number] = [100, 100, 115];
  const LIGHT_GRAY: [number, number, number] = [225, 225, 235];
  const BG_LIGHT: [number, number, number] = [250, 251, 254];
  const ACCENT: [number, number, number] = [0, 82, 255]; // Vivid blue

  // ── Header: Org info + Logo ──
  if (options.organization) {
    const org = options.organization;

    // Org info — LEFT aligned
    let iy = y + 2;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    const companyTitle = org.company_name || org.trade_name || '';
    if (companyTitle) {
      doc.text(companyTitle.toUpperCase(), margin, iy);
      iy += 4.5;
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    if (org.cnpj) { doc.text(`CNPJ: ${org.cnpj}`, margin, iy); iy += 4; }
    if (org.business_email) { doc.text(org.business_email, margin, iy); iy += 4; }
    if (org.business_phone) { doc.text(org.business_phone, margin, iy); iy += 4; }
    if (org.website) { doc.text(org.website, margin, iy); }

    // Logo — RIGHT aligned
    if (org.logo_url) {
      const logoResult = await loadImageAsBase64(org.logo_url);
      if (logoResult) {
        const maxLogoH = 12;
        const maxLogoW = contentW * 0.3;
        const ratio = logoResult.width / logoResult.height;
        let logoW = maxLogoH * ratio;
        let logoH = maxLogoH;
        if (logoW > maxLogoW) { logoW = maxLogoW; logoH = logoW / ratio; }
        doc.addImage(logoResult.data, 'PNG', pw - margin - logoW, y, logoW, logoH);
      }
    }
    
    y = Math.max(y + 22, iy + 10);
  } else {
    y += 10;
  }

  // ── Header ──
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  
  const invoiceTitle = options.invoiceName
    ? `FATURA - ${options.invoiceName.toUpperCase()}`
    : 'FATURA';

  doc.text(invoiceTitle, pw / 2, y + 8, { align: 'center' });
  y += 22;

  // ── Info Blocks: Client & Details ──
  const colW = (contentW - 10) / 2;
  const blockH = 36;

  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.05);

  // Client Block
  if (options.client) {
    const cl = options.client;
    doc.roundedRect(margin, y, colW, blockH, 1.5, 1.5, 'S');
    
    let subY = y + 6;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ACCENT);
    doc.text('CLIENTE', margin + 6, subY);
    subY += 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    doc.text(cl.name, margin + 6, subY);
    subY += 6;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    if (cl.document) {
      const digits = (cl.document || '').replace(/\D/g, '');
      const docLabel = digits.length > 11 ? 'CNPJ: ' : 'CPF: ';
      doc.text(`${docLabel}${cl.document}`, margin + 6, subY);
      subY += 4.5;
    }
    if (cl.email) { doc.text(cl.email, margin + 6, subY); subY += 4.5; }
    if (cl.phone) { doc.text(cl.phone, margin + 6, subY); }
  }

  // Details Block
  doc.roundedRect(margin + colW + 10, y, colW, blockH, 1.5, 1.5, 'S');
  
  let detY = y + 6;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ACCENT);
  doc.text('DADOS DA FATURA', margin + colW + 16, detY);
  detY += 8;

  const drawRow = (label: string, value: string, py: number) => {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(label, margin + colW + 16, py);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(value, margin + colW + 36, py);
  };

  drawRow('Status:', options.status || '-', detY); detY += 5.5;
  drawRow('Emissão:', new Date(options.createdAt).toLocaleDateString('pt-BR'), detY); detY += 5.5;
  if (options.dueDate) { drawRow('Vencimento:', new Date(options.dueDate + 'T12:00:00').toLocaleDateString('pt-BR'), detY); detY += 5.5; }
  if (options.paymentMethod) drawRow('Pagamento:', options.paymentMethod, detY);

  y += blockH + 12;

  // ── Items Table ──
  doc.setFillColor(...DARK);
  doc.roundedRect(margin, y, contentW, 10, 1.5, 1.5, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  const c1 = margin + 5;
  const c2 = margin + 15;
  const c3 = margin + contentW - 75; // QTD
  const c4 = margin + contentW - 55; // UNIT
  const c5 = margin + contentW - 5;  // TOTAL

  doc.text('#', c1, y + 6.5);
  doc.text('DESCRIÇÃO', c2, y + 6.5);
  doc.text('QTD', c3, y + 6.5);
  doc.text('VALOR UNIT.', c4, y + 6.5);
  const stH = 'SUBTOTAL';
  doc.text(stH, c5 - doc.getTextWidth(stH), y + 6.5);
  y += 15;

  options.items.forEach((item, idx) => {
    const descW = c3 - c2 - 10;
    const wrappedDesc = doc.splitTextToSize(sanitizeText(item.description) || '-', descW);
    const rowH = Math.max(10, wrappedDesc.length * 5 + 4);

    if (y + rowH > pageH - 30) { doc.addPage(); y = 20; }

    doc.setDrawColor(...LIGHT_GRAY);
    doc.setLineWidth(0.1);
    doc.line(margin, y + rowH - 5, pw - margin, y + rowH - 5);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(String(idx + 1).padStart(2, '0'), c1, y);
    doc.setTextColor(...DARK);
    doc.text(wrappedDesc, c2, y);
    doc.setTextColor(...GRAY);
    doc.text(String(item.quantity), c3 + 2, y);
    doc.text(formatCurrency(item.unitPrice), c4, y);
    const sub = item.quantity * item.unitPrice;
    const subText = formatCurrency(sub);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    doc.text(subText, c5 - doc.getTextWidth(subText), y);
    y += rowH;
  });

  y += 10;

  // ── Totals ──
  const totalsX = margin + contentW - 80;
  const subtotalVal = options.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const addTotalRow = (label: string, val: string, isFinal = false) => {
    if (isFinal) {
      y += 4;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...ACCENT);
      doc.text(label, totalsX, y);
      const valW = doc.getTextWidth(val);
      doc.text(val, pw - margin - valW, y);
      y += 10;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      doc.text(label, totalsX, y);
      const valW = doc.getTextWidth(val);
      doc.text(val, pw - margin - valW, y);
      y += 7;
    }
  };

  addTotalRow('Subtotal:', formatCurrency(subtotalVal));
  if (options.taxes > 0) {
    addTotalRow(`Impostos (${options.taxes}%):`, formatCurrency(subtotalVal * options.taxes / 100));
  }
  if (options.discount > 0) {
    doc.setTextColor(220, 50, 50);
    addTotalRow(`Desconto:`, `- ${formatCurrency(options.discount)}`);
  }
  addTotalRow('TOTAL DA FATURA:', formatCurrency(options.total), true);

  // ── Footer ──
  const footerY = pageH - 15;
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pw - margin, footerY - 5);
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  const footerLeft = options.organization?.trade_name || options.organization?.company_name || '';
  if (footerLeft) doc.text(footerLeft, margin, footerY);
  const pageNum = `Página ${doc.internal.pages.length - 1}`;
  doc.text(pageNum, pw / 2 - doc.getTextWidth(pageNum) / 2, footerY);
  doc.text('Gerado por Freelance Hub', pw - margin - doc.getTextWidth('Gerado por Freelance Hub'), footerY);

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
