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
  const margin = 18;
  const contentW = pw - margin * 2;
  let y = 16;

  const accentR = 37, accentG = 99, accentB = 235; // professional blue

  // ── Top accent bar ──
  doc.setFillColor(accentR, accentG, accentB);
  doc.rect(0, 0, pw, 4, 'F');

  // ── Organization Header ──
  if (options.organization) {
    const org = options.organization;
    y = 18;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(org.company_name || org.trade_name || 'Empresa', margin, y);
    y += 7;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 110, 110);

    const orgLines: string[] = [];
    if (org.trade_name && org.company_name) orgLines.push(org.trade_name);
    if (org.cnpj) orgLines.push(`CNPJ: ${org.cnpj}`);
    const regParts: string[] = [];
    if (org.state_registration) regParts.push(`IE: ${org.state_registration}`);
    if (org.municipal_registration) regParts.push(`IM: ${org.municipal_registration}`);
    if (regParts.length) orgLines.push(regParts.join('  •  '));
    const contactParts: string[] = [];
    if (org.business_phone) contactParts.push(org.business_phone);
    if (org.business_email) contactParts.push(org.business_email);
    if (org.website) contactParts.push(org.website);
    if (contactParts.length) orgLines.push(contactParts.join('  •  '));

    orgLines.forEach(line => {
      doc.text(line, margin, y);
      y += 4;
    });
    y += 2;
  }

  // ── Title band ──
  y += 2;
  doc.setFillColor(accentR, accentG, accentB);
  doc.roundedRect(margin, y, contentW, 12, 2, 2, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('ORÇAMENTO', margin + 5, y + 8);

  // Budget name on the right
  if (options.budgetName) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const nameW = doc.getTextWidth(options.budgetName);
    doc.text(options.budgetName, pw - margin - 5 - nameW, y + 8);
  }
  y += 18;

  // ── Two-column: Dates | Client ──
  const colW = contentW / 2 - 4;
  const colLeftX = margin;
  const colRightX = margin + colW + 8;
  const metaStartY = y;

  // Left column — Dates
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(accentR, accentG, accentB);
  doc.text('DETALHES', colLeftX, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8.5);

  const addMetaRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(90, 90, 90);
    doc.text(label, colLeftX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(value, colLeftX + 28, y);
    y += 5;
  };

  if (options.budgetDate) addMetaRow('Data:', new Date(options.budgetDate + 'T12:00:00').toLocaleDateString('pt-BR'));
  if (options.validityDate) addMetaRow('Validade:', new Date(options.validityDate + 'T12:00:00').toLocaleDateString('pt-BR'));
  if (options.deliveryDate) addMetaRow('Entrega:', new Date(options.deliveryDate + 'T12:00:00').toLocaleDateString('pt-BR'));

  // Right column — Client
  if (options.client) {
    const cl = options.client;
    let cy = metaStartY;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(accentR, accentG, accentB);
    doc.text('CLIENTE', colRightX, cy);
    cy += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(cl.name, colRightX, cy);
    cy += 5;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    if (cl.document) { doc.text(cl.document, colRightX, cy); cy += 4; }
    if (cl.responsible) { doc.text(`Resp: ${cl.responsible}`, colRightX, cy); cy += 4; }
    if (cl.email) { doc.text(cl.email, colRightX, cy); cy += 4; }
    if (cl.phone) { doc.text(cl.phone, colRightX, cy); cy += 4; }

    y = Math.max(y, cy);
  }

  y += 6;

  // ── Items Table ──
  // Header row
  doc.setFillColor(240, 243, 248);
  doc.roundedRect(margin, y, contentW, 9, 1.5, 1.5, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);

  const col1 = margin + 4;
  const col2 = margin + 100;
  const col3 = margin + 118;
  const col4 = margin + contentW - 4;

  doc.text('#', margin + 2, y + 6);
  doc.text('Descrição', col1 + 6, y + 6);
  doc.text('Qtd', col2, y + 6);
  doc.text('Valor Unit.', col3, y + 6);
  doc.text('Subtotal', col4 - doc.getTextWidth('Subtotal'), y + 6);
  y += 12;

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  options.items.forEach((item, idx) => {
    if (y > 260) { doc.addPage(); y = 20; }

    // Zebra stripe
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, y - 4, contentW, 8, 'F');
    }

    const sub = item.quantity * item.unitPrice;
    doc.setTextColor(100, 100, 100);
    doc.text(String(idx + 1), margin + 2, y);
    doc.setTextColor(30, 30, 30);
    doc.text(item.description || '-', col1 + 6, y);
    doc.setTextColor(60, 60, 60);
    doc.text(String(item.quantity), col2 + 4, y);
    doc.text(formatCurrency(item.unitPrice), col3, y);
    const subText = formatCurrency(sub);
    doc.setFont('helvetica', 'bold');
    doc.text(subText, col4 - doc.getTextWidth(subText), y);
    doc.setFont('helvetica', 'normal');
    y += 8;
  });

  // Bottom line under items
  y += 2;
  doc.setDrawColor(220, 225, 235);
  doc.line(margin, y, pw - margin, y);
  y += 8;

  // ── Totals Box ──
  const totalsX = margin + contentW - 70;
  const subtotal = options.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  const rightAlign = (label: string, val: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, totalsX, y);
    const valW = doc.getTextWidth(val);
    doc.text(val, pw - margin - valW, y);
    y += 6;
  };

  rightAlign('Subtotal:', formatCurrency(subtotal));
  if (options.discount > 0) {
    doc.setTextColor(200, 60, 60);
    rightAlign('Desconto:', `- ${formatCurrency(options.discount)}`);
  }

  y += 2;
  doc.setFillColor(accentR, accentG, accentB);
  doc.roundedRect(totalsX - 4, y - 5, pw - margin - totalsX + 4, 12, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', totalsX, y + 3);
  const totalText = formatCurrency(options.total);
  const totalW = doc.getTextWidth(totalText);
  doc.text(totalText, pw - margin - totalW, y + 3);
  y += 16;

  // ── Notes ──
  if (options.notes) {
    if (y > 235) { doc.addPage(); y = 20; }
    doc.setFillColor(248, 249, 252);
    const noteLines = doc.splitTextToSize(options.notes, contentW - 16);
    const noteBlockH = Math.max(noteLines.length * 4.5 + 14, 20);
    doc.roundedRect(margin, y, contentW, noteBlockH, 2, 2, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(accentR, accentG, accentB);
    doc.text('OBSERVAÇÕES', margin + 6, y + 8);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(noteLines, margin + 6, y + 14);
    y += noteBlockH + 6;
  }

  // ── Footer ──
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(220, 225, 235);
  doc.line(margin, pageH - 14, pw - margin, pageH - 14);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.text('Documento gerado automaticamente', margin, pageH - 9);
  if (options.budgetDate) {
    const dateStr = new Date(options.budgetDate + 'T12:00:00').toLocaleDateString('pt-BR');
    const dateW = doc.getTextWidth(dateStr);
    doc.text(dateStr, pw - margin - dateW, pageH - 9);
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
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // === Organization Header ===
  if (options.organization) {
    const org = options.organization;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(org.company_name || org.trade_name || 'Empresa', 20, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    if (org.trade_name && org.company_name) { doc.text(`Nome Fantasia: ${org.trade_name}`, 20, y); y += 4.5; }
    if (org.cnpj) { doc.text(`CNPJ: ${org.cnpj}`, 20, y); y += 4.5; }
    if (org.state_registration) { doc.text(`IE: ${org.state_registration}`, 20, y); y += 4.5; }
    if (org.municipal_registration) { doc.text(`IM: ${org.municipal_registration}`, 20, y); y += 4.5; }
    if (org.business_phone) { doc.text(`Tel: ${org.business_phone}`, 20, y); y += 4.5; }
    if (org.business_email) { doc.text(`E-mail: ${org.business_email}`, 20, y); y += 4.5; }
    if (org.website) { doc.text(`Site: ${org.website}`, 20, y); y += 4.5; }
    y += 4;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pageWidth - 20, y);
  y += 8;

  // === Invoice Title & Meta ===
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(options.invoiceName || 'Fatura', 20, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Status: ${options.status}`, 20, y); y += 4.5;
  doc.text(`Data: ${new Date(options.createdAt).toLocaleDateString('pt-BR')}`, 20, y); y += 4.5;
  if (options.dueDate) {
    doc.text(`Vencimento: ${new Date(options.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}`, 20, y); y += 4.5;
  }
  if (options.paymentMethod) {
    doc.text(`Pagamento: ${options.paymentMethod}`, 20, y); y += 4.5;
  }
  y += 4;

  // === Client Section ===
  if (options.client) {
    const cl = options.client;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente', 20, y); y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(cl.name, 20, y); y += 4.5;
    if (cl.document) { doc.text(`CPF/CNPJ: ${cl.document}`, 20, y); y += 4.5; }
    if (cl.responsible) { doc.text(`Responsável: ${cl.responsible}`, 20, y); y += 4.5; }
    if (cl.email) { doc.text(`E-mail: ${cl.email}`, 20, y); y += 4.5; }
    if (cl.phone) { doc.text(`Tel: ${cl.phone}`, 20, y); y += 4.5; }
    y += 4;
  }

  // === Items Table ===
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pageWidth - 20, y);
  y += 6;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(245, 245, 245);
  doc.rect(20, y - 3, pageWidth - 40, 8, 'F');
  doc.text('Descrição', 22, y + 2);
  doc.text('Qtd', 120, y + 2);
  doc.text('Valor Unit.', 138, y + 2);
  doc.text('Subtotal', 168, y + 2);
  y += 10;

  doc.setFont('helvetica', 'normal');
  options.items.forEach((item) => {
    if (y > 265) { doc.addPage(); y = 20; }
    const subtotal = item.quantity * item.unitPrice;
    doc.text(item.description || '-', 22, y);
    doc.text(String(item.quantity), 122, y);
    doc.text(formatCurrency(item.unitPrice), 138, y);
    doc.text(formatCurrency(subtotal), 168, y);
    y += 7;
  });

  // === Totals ===
  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(120, y, pageWidth - 20, y);
  y += 8;

  const subtotal = options.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  doc.setFontSize(10);
  doc.text(`Subtotal: ${formatCurrency(subtotal)}`, 138, y); y += 6;
  if (options.taxes > 0) {
    doc.text(`Impostos (${options.taxes}%): ${formatCurrency(subtotal * options.taxes / 100)}`, 138, y); y += 6;
  }
  if (options.discount > 0) {
    doc.text(`Desconto: -${formatCurrency(options.discount)}`, 138, y); y += 6;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total: ${formatCurrency(options.total)}`, 138, y);

  // === Footer ===
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.text('Documento gerado automaticamente', 20, 280);

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
