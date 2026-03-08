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

    if (org.trade_name && org.company_name) {
      doc.text(`Nome Fantasia: ${org.trade_name}`, 20, y);
      y += 4.5;
    }
    if (org.cnpj) {
      doc.text(`CNPJ: ${org.cnpj}`, 20, y);
      y += 4.5;
    }
    if (org.state_registration) {
      doc.text(`IE: ${org.state_registration}`, 20, y);
      y += 4.5;
    }
    if (org.municipal_registration) {
      doc.text(`IM: ${org.municipal_registration}`, 20, y);
      y += 4.5;
    }
    if (org.business_phone) {
      doc.text(`Tel: ${org.business_phone}`, 20, y);
      y += 4.5;
    }
    if (org.business_email) {
      doc.text(`E-mail: ${org.business_email}`, 20, y);
      y += 4.5;
    }
    if (org.website) {
      doc.text(`Site: ${org.website}`, 20, y);
      y += 4.5;
    }
    y += 4;
  }

  // === Divider ===
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pageWidth - 20, y);
  y += 8;

  // === Budget Title & Dates ===
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(options.budgetName || 'Orçamento', 20, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  if (options.budgetDate) {
    doc.text(`Data: ${new Date(options.budgetDate + 'T12:00:00').toLocaleDateString('pt-BR')}`, 20, y);
    y += 4.5;
  }
  if (options.validityDate) {
    doc.text(`Validade: ${new Date(options.validityDate + 'T12:00:00').toLocaleDateString('pt-BR')}`, 20, y);
    y += 4.5;
  }
  if (options.deliveryDate) {
    doc.text(`Entrega: ${new Date(options.deliveryDate + 'T12:00:00').toLocaleDateString('pt-BR')}`, 20, y);
    y += 4.5;
  }
  y += 4;

  // === Client Section ===
  if (options.client) {
    const cl = options.client;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente', 20, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    doc.text(cl.name, 20, y);
    y += 4.5;
    if (cl.document) {
      doc.text(`CPF/CNPJ: ${cl.document}`, 20, y);
      y += 4.5;
    }
    if (cl.responsible) {
      doc.text(`Responsável: ${cl.responsible}`, 20, y);
      y += 4.5;
    }
    if (cl.email) {
      doc.text(`E-mail: ${cl.email}`, 20, y);
      y += 4.5;
    }
    if (cl.phone) {
      doc.text(`Tel: ${cl.phone}`, 20, y);
      y += 4.5;
    }
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
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
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
  doc.text(`Subtotal: ${formatCurrency(subtotal)}`, 138, y);
  y += 6;

  if (options.discount > 0) {
    doc.text(`Desconto: -${formatCurrency(options.discount)}`, 138, y);
    y += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total: ${formatCurrency(options.total)}`, 138, y);
  y += 10;

  // === Notes ===
  if (options.notes) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações', 20, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(options.notes, pageWidth - 40);
    doc.text(lines, 20, y);
    y += lines.length * 4.5;
  }

  // === Footer ===
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.text('Documento gerado automaticamente', 20, 280);

  const datePart = options.budgetDate || new Date().toISOString().slice(0, 10);
  const filename = `orcamento_${datePart}.pdf`;
  doc.save(filename);
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
