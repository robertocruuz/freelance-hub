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

export const generateBudgetPdf = (options: BudgetPdfOptions) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pw - margin * 2;
  let y = 20;

  // ── Organization Header ──
  if (options.organization) {
    const org = options.organization;
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 25, 25);
    doc.text(org.trade_name || 'Empresa', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    if (org.cnpj) { doc.text(`CNPJ: ${org.cnpj}`, margin, y); y += 5.5; }
    const contactParts: string[] = [];
    if (org.business_phone) contactParts.push(org.business_phone);
    if (org.business_email) contactParts.push(org.business_email);
    if (org.website) contactParts.push(org.website);
    if (contactParts.length) { doc.text(contactParts.join('   |   '), margin, y); y += 5.5; }
    y += 4;
  }

  // ── Thin accent line ──
  doc.setDrawColor(55, 120, 220);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pw - margin, y);
  doc.setLineWidth(0.2);
  y += 10;

  // ── Title row ──
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 120, 220);
  doc.text('ORÇAMENTO', margin, y);

  if (options.budgetName) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const nameW = doc.getTextWidth(options.budgetName);
    doc.text(options.budgetName, pw - margin - nameW, y);
  }
  y += 12;

  // ── Two-column layout: Dates | Client ──
  const colLeftX = margin;
  const colRightX = margin + contentW / 2 + 6;
  const metaStartY = y;

  // Left — Dates
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 120, 220);
  doc.text('DETALHES', colLeftX, y);
  y += 7;

  doc.setFontSize(11);
  const addMetaRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(label, colLeftX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(35, 35, 35);
    doc.text(value, colLeftX + 32, y);
    y += 6.5;
  };

  if (options.budgetDate) addMetaRow('Data:', new Date(options.budgetDate + 'T12:00:00').toLocaleDateString('pt-BR'));
  if (options.validityDate) addMetaRow('Validade:', new Date(options.validityDate + 'T12:00:00').toLocaleDateString('pt-BR'));
  if (options.deliveryDate) addMetaRow('Entrega:', new Date(options.deliveryDate + 'T12:00:00').toLocaleDateString('pt-BR'));

  // Right — Client
  if (options.client) {
    const cl = options.client;
    let cy = metaStartY;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 120, 220);
    doc.text('CLIENTE', colRightX, cy);
    cy += 7;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 25, 25);
    doc.text(cl.name, colRightX, cy);
    cy += 6.5;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    if (cl.document) { doc.text(cl.document, colRightX, cy); cy += 5.5; }
    if (cl.responsible) { doc.text(`Resp: ${cl.responsible}`, colRightX, cy); cy += 5.5; }
    if (cl.email) { doc.text(cl.email, colRightX, cy); cy += 5.5; }
    if (cl.phone) { doc.text(cl.phone, colRightX, cy); cy += 5.5; }

    y = Math.max(y, cy);
  }

  y += 10;

  // ── Items Table ──
  // Header
  doc.setFillColor(55, 120, 220);
  doc.rect(margin, y, contentW, 10, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  const col1 = margin + 5;
  const col2 = margin + 105;
  const col3 = margin + 125;
  const col4 = pw - margin - 5;

  doc.text('#', margin + 3, y + 7);
  doc.text('Descrição', col1 + 8, y + 7);
  doc.text('Qtd', col2, y + 7);
  doc.text('Valor Unit.', col3, y + 7);
  const stHeader = 'Subtotal';
  doc.text(stHeader, col4 - doc.getTextWidth(stHeader), y + 7);
  y += 14;

  // Rows
  doc.setFontSize(10);
  options.items.forEach((item, idx) => {
    if (y > 255) { doc.addPage(); y = 20; }

    if (idx % 2 === 0) {
      doc.setFillColor(245, 248, 255);
      doc.rect(margin, y - 5, contentW, 10, 'F');
    }

    const sub = item.quantity * item.unitPrice;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(String(idx + 1), margin + 3, y);
    doc.setTextColor(30, 30, 30);
    doc.text(item.description || '-', col1 + 8, y);
    doc.setTextColor(60, 60, 60);
    doc.text(String(item.quantity), col2 + 2, y);
    doc.text(formatCurrency(item.unitPrice), col3, y);
    const subText = formatCurrency(sub);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(subText, col4 - doc.getTextWidth(subText), y);
    doc.setFont('helvetica', 'normal');
    y += 10;
  });

  // Bottom border
  y += 2;
  doc.setDrawColor(200, 210, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pw - margin, y);
  doc.setLineWidth(0.2);
  y += 10;

  // ── Totals ──
  const totalsX = margin + contentW - 80;
  const subtotal = options.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  const rightAlign = (label: string, val: string) => {
    doc.text(label, totalsX, y);
    const valW = doc.getTextWidth(val);
    doc.text(val, pw - margin - valW, y);
    y += 7;
  };

  rightAlign('Subtotal:', formatCurrency(subtotal));
  if (options.discount > 0) {
    doc.setTextColor(200, 60, 60);
    rightAlign('Desconto:', `- ${formatCurrency(options.discount)}`);
  }

  y += 3;
  doc.setDrawColor(55, 120, 220);
  doc.setLineWidth(0.5);
  doc.line(totalsX - 4, y - 3, pw - margin, y - 3);
  doc.setLineWidth(0.2);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 120, 220);
  doc.text('Total:', totalsX, y + 4);
  const totalText = formatCurrency(options.total);
  doc.setTextColor(25, 25, 25);
  const totalW = doc.getTextWidth(totalText);
  doc.text(totalText, pw - margin - totalW, y + 4);
  y += 18;

  // ── Notes ──
  if (options.notes) {
    if (y > 230) { doc.addPage(); y = 20; }

    doc.setDrawColor(200, 210, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pw - margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 120, 220);
    doc.text('OBSERVAÇÕES', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const noteLines = doc.splitTextToSize(options.notes, contentW);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5.5 + 6;
  }

  // ── Footer ──
  doc.setDrawColor(200, 210, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, pageH - 16, pw - margin, pageH - 16);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('Documento gerado automaticamente', margin, pageH - 10);
  if (options.budgetDate) {
    const dateStr = new Date(options.budgetDate + 'T12:00:00').toLocaleDateString('pt-BR');
    const dateW = doc.getTextWidth(dateStr);
    doc.text(dateStr, pw - margin - dateW, pageH - 10);
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

export const generateInvoicePdf = (options: InvoicePdfOptions) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pw - margin * 2;
  let y = 20;

  // ── Organization Header ──
  if (options.organization) {
    const org = options.organization;
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 25, 25);
    doc.text(org.trade_name || 'Empresa', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    if (org.cnpj) { doc.text(`CNPJ: ${org.cnpj}`, margin, y); y += 5.5; }
    const contactParts: string[] = [];
    if (org.business_phone) contactParts.push(org.business_phone);
    if (org.business_email) contactParts.push(org.business_email);
    if (org.website) contactParts.push(org.website);
    if (contactParts.length) { doc.text(contactParts.join('   |   '), margin, y); y += 5.5; }
    y += 4;
  }

  // ── Accent line ──
  doc.setDrawColor(55, 120, 220);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pw - margin, y);
  doc.setLineWidth(0.2);
  y += 10;

  // ── Title row ──
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 120, 220);
  doc.text('FATURA', margin, y);

  if (options.invoiceName) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const nameW = doc.getTextWidth(options.invoiceName);
    doc.text(options.invoiceName, pw - margin - nameW, y);
  }
  y += 12;

  // ── Two-column: Details | Client ──
  const colLeftX = margin;
  const colRightX = margin + contentW / 2 + 6;
  const metaStartY = y;

  // Left — Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 120, 220);
  doc.text('DETALHES', colLeftX, y);
  y += 7;

  doc.setFontSize(11);
  const addMetaRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(label, colLeftX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(35, 35, 35);
    doc.text(value, colLeftX + 36, y);
    y += 6.5;
  };

  addMetaRow('Status:', options.status);
  addMetaRow('Data:', new Date(options.createdAt).toLocaleDateString('pt-BR'));
  if (options.dueDate) addMetaRow('Vencimento:', new Date(options.dueDate + 'T12:00:00').toLocaleDateString('pt-BR'));
  if (options.paymentMethod) addMetaRow('Pagamento:', options.paymentMethod);

  // Right — Client
  if (options.client) {
    const cl = options.client;
    let cy = metaStartY;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 120, 220);
    doc.text('CLIENTE', colRightX, cy);
    cy += 7;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 25, 25);
    doc.text(cl.name, colRightX, cy);
    cy += 6.5;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    if (cl.document) { doc.text(cl.document, colRightX, cy); cy += 5.5; }
    if (cl.responsible) { doc.text(`Resp: ${cl.responsible}`, colRightX, cy); cy += 5.5; }
    if (cl.email) { doc.text(cl.email, colRightX, cy); cy += 5.5; }
    if (cl.phone) { doc.text(cl.phone, colRightX, cy); cy += 5.5; }

    y = Math.max(y, cy);
  }

  y += 10;

  // ── Items Table ──
  doc.setFillColor(55, 120, 220);
  doc.rect(margin, y, contentW, 10, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  const col1 = margin + 5;
  const col2 = margin + 105;
  const col3 = margin + 125;
  const col4 = pw - margin - 5;

  doc.text('#', margin + 3, y + 7);
  doc.text('Descrição', col1 + 8, y + 7);
  doc.text('Qtd', col2, y + 7);
  doc.text('Valor Unit.', col3, y + 7);
  const stHeader = 'Subtotal';
  doc.text(stHeader, col4 - doc.getTextWidth(stHeader), y + 7);
  y += 14;

  // Rows
  doc.setFontSize(10);
  options.items.forEach((item, idx) => {
    if (y > 255) { doc.addPage(); y = 20; }

    if (idx % 2 === 0) {
      doc.setFillColor(245, 248, 255);
      doc.rect(margin, y - 5, contentW, 10, 'F');
    }

    const sub = item.quantity * item.unitPrice;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(String(idx + 1), margin + 3, y);
    doc.setTextColor(30, 30, 30);
    doc.text(item.description || '-', col1 + 8, y);
    doc.setTextColor(60, 60, 60);
    doc.text(String(item.quantity), col2 + 2, y);
    doc.text(formatCurrency(item.unitPrice), col3, y);
    const subText = formatCurrency(sub);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(subText, col4 - doc.getTextWidth(subText), y);
    doc.setFont('helvetica', 'normal');
    y += 10;
  });

  // Bottom border
  y += 2;
  doc.setDrawColor(200, 210, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pw - margin, y);
  doc.setLineWidth(0.2);
  y += 10;

  // ── Totals ──
  const totalsX = margin + contentW - 80;
  const subtotal = options.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  const rightAlign = (label: string, val: string) => {
    doc.text(label, totalsX, y);
    const valW = doc.getTextWidth(val);
    doc.text(val, pw - margin - valW, y);
    y += 7;
  };

  rightAlign('Subtotal:', formatCurrency(subtotal));
  if (options.taxes > 0) {
    doc.setTextColor(80, 80, 80);
    rightAlign(`Impostos (${options.taxes}%):`, formatCurrency(subtotal * options.taxes / 100));
  }
  if (options.discount > 0) {
    doc.setTextColor(200, 60, 60);
    rightAlign('Desconto:', `- ${formatCurrency(options.discount)}`);
  }

  y += 3;
  doc.setDrawColor(55, 120, 220);
  doc.setLineWidth(0.5);
  doc.line(totalsX - 4, y - 3, pw - margin, y - 3);
  doc.setLineWidth(0.2);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 120, 220);
  doc.text('Total:', totalsX, y + 4);
  const totalText = formatCurrency(options.total);
  doc.setTextColor(25, 25, 25);
  const totalW = doc.getTextWidth(totalText);
  doc.text(totalText, pw - margin - totalW, y + 4);

  // ── Footer ──
  doc.setDrawColor(200, 210, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, pageH - 16, pw - margin, pageH - 16);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('Documento gerado automaticamente', margin, pageH - 10);
  const dateStr = new Date(options.createdAt).toLocaleDateString('pt-BR');
  const dateW = doc.getTextWidth(dateStr);
  doc.text(dateStr, pw - margin - dateW, pageH - 10);

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
