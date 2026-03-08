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

export const generateDocumentPdf = (options: PdfOptions) => {
  const doc = new jsPDF();
  const { title, type, items, total, status, createdAt, taxes, discount, dueDate } = options;

  // Header
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

  // Table header
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

  // Items
  doc.setFont('helvetica', 'normal');
  let y = tableTop + 14;
  items.forEach((item) => {
    const subtotal = item.quantity * item.unitPrice;
    doc.text(item.description || '-', 22, y);
    doc.text(String(item.quantity), 122, y);
    doc.text(`R$ ${item.unitPrice.toFixed(2)}`, 140, y);
    doc.text(`R$ ${subtotal.toFixed(2)}`, 168, y);
    y += 7;
  });

  // Separator
  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(20, y, 190, y);
  y += 8;

  // Totals
  doc.setFontSize(10);
  if (type === 'invoice') {
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    doc.text(`Subtotal: R$ ${subtotal.toFixed(2)}`, 140, y);
    y += 6;
    if (taxes) {
      doc.text(`Impostos (${taxes}%): R$ ${(subtotal * taxes / 100).toFixed(2)}`, 140, y);
      y += 6;
    }
    if (discount) {
      doc.text(`Desconto: -R$ ${discount.toFixed(2)}`, 140, y);
      y += 6;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total: R$ ${total.toFixed(2)}`, 140, y);

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.text('Documento gerado automaticamente', 20, 280);

  const filename = `${type === 'budget' ? 'orcamento' : 'fatura'}_${new Date(createdAt).toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
};
