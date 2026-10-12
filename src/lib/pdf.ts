import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extender jsPDF con autoTable
type jsPDFWithAutoTable = jsPDF & { autoTable: typeof autoTable };

export async function exportToPDF(title: string, data: { label: string; value: string }[], tableData?: { headers: string[]; rows: string[][] }) {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  
  // Título
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  
  // Fecha
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 28);
  
  // Resumen
  doc.setTextColor(0);
  doc.setFontSize(12);
  let y = 40;
  data.forEach(item => {
    doc.text(`${item.label}:`, 14, y);
    doc.text(item.value, 80, y);
    y += 7;
  });
  
  // Tabla si existe
  if (tableData && tableData.rows.length > 0) {
    y += 5;
    doc.autoTable({
      head: [tableData.headers],
      body: tableData.rows,
      startY: y,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 64, 175] },
    });
  }
  
  doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}
