import { jsPDF } from 'jspdf';
import { formatBRL, formatDateTimeBR } from './format';

export function exportReportPdf(params: {
  title: string;
  subtitle: string;
  headers: string[];
  rows: (string | number)[][];
  summaryLines?: string[];
  filename: string;
}): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 83, 45);
  doc.text('PetClick — Relatório Gerencial', 14, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(28, 25, 23);
  doc.text(params.title, 14, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`${params.subtitle} · Gerado em ${formatDateTimeBR(new Date())}`, 14, y);
  y += 8;

  if (params.summaryLines && params.summaryLines.length > 0) {
    doc.setDrawColor(231, 229, 228);
    doc.setFillColor(250, 249, 246);
    doc.rect(14, y, 182, params.summaryLines.length * 6 + 6, 'FD');
    y += 5;
    doc.setFontSize(9.5);
    doc.setTextColor(28, 25, 23);
    for (const line of params.summaryLines) {
      doc.text(line, 18, y);
      y += 6;
    }
    y += 5;
  }

  const colWidth = Math.floor(182 / Math.max(1, params.headers.length));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setFillColor(20, 83, 45);
  doc.setTextColor(255, 255, 255);
  doc.rect(14, y, 182, 7, 'F');
  params.headers.forEach((h, idx) => {
    doc.text(String(h).slice(0, 24), 16 + idx * colWidth, y + 4.8);
  });
  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(28, 25, 23);

  for (const row of params.rows) {
    if (y > 275) {
      doc.addPage();
      y = 18;
    }
    row.forEach((cell, idx) => {
      doc.text(String(cell ?? '').slice(0, 26), 16 + idx * colWidth, y);
    });
    doc.setDrawColor(240, 240, 238);
    doc.line(14, y + 1.8, 196, y + 1.8);
    y += 6;
  }

  doc.save(params.filename.endsWith('.pdf') ? params.filename : `${params.filename}.pdf`);
}

export function exportPosReceiptPdf(params: {
  saleId: string;
  date: unknown;
  operatorName: string;
  customerName?: string;
  paymentMethod: string;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  changeGiven: number;
}): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 180] });
  let y = 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PETCLICK PETSHOP', 40, y, { align: 'center' });
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Tudo para seu pet em um só lugar!', 40, y, { align: 'center' });
  y += 5;
  doc.text(`Comprovante PDV #${params.saleId}`, 6, y);
  y += 4;
  doc.text(`Data: ${formatDateTimeBR(params.date)}`, 6, y);
  y += 4;
  doc.text(`Operador: ${params.operatorName}`, 6, y);
  y += 4;
  if (params.customerName) {
    doc.text(`Cliente: ${params.customerName}`, 6, y);
    y += 4;
  }
  doc.line(6, y, 74, y);
  y += 4;

  for (const item of params.items) {
    doc.text(`${item.quantity}x ${item.name.slice(0, 26)}`, 6, y);
    doc.text(formatBRL(item.total), 74, y, { align: 'right' });
    y += 4.2;
  }

  doc.line(6, y, 74, y);
  y += 4.5;
  doc.text(`Subtotal:`, 6, y);
  doc.text(formatBRL(params.subtotal), 74, y, { align: 'right' });
  y += 4;
  if (params.discount > 0) {
    doc.text(`Desconto:`, 6, y);
    doc.text(`-${formatBRL(params.discount)}`, 74, y, { align: 'right' });
    y += 4;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`TOTAL:`, 6, y);
  doc.text(formatBRL(params.total), 74, y, { align: 'right' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Pagamento: ${params.paymentMethod.toUpperCase()}`, 6, y);
  y += 4;
  doc.text(`Valor recebido: ${formatBRL(params.amountPaid)}`, 6, y);
  y += 4;
  if (params.changeGiven > 0) {
    doc.text(`Troco: ${formatBRL(params.changeGiven)}`, 6, y);
    y += 4;
  }
  y += 4;
  doc.text('Obrigado pela preferência!', 40, y, { align: 'center' });
  doc.save(`recibo-${params.saleId}.pdf`);
}
