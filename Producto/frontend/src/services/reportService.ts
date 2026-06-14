import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface AlumnoReportRow {
  nombre: string;
  email: string;
  telefono: string;
  estado: string;
  categoria: string;
  fechaRegistro: string;
}

const STATUS_LABEL: Record<string, string> = {
  APPROVED: 'Aprobado',
  PENDING: 'En Revisión',
  INACTIVE: 'Inactivo',
  PENDIENTE: 'Pendiente',
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
};

const CATEGORY_LABEL: Record<string, string> = {
  ADULT: 'Adulto',
  MINOR: 'Menor',
  BOTH: 'Ambos',
  NONE: '—',
};

const formatPhone = (phone?: string) => {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('56') ? digits.slice(2) : digits;
  const n = local.startsWith('9') ? local.slice(1) : local;
  if (n.length < 8) return phone;
  return `+56 9 ${n.slice(0, 4)} ${n.slice(4, 8)}`;
};

const formatDate = (val: any) => {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CL');
};

/**
 * Función helper robusta para descargar archivos Blob en el navegador.
 * Resuelve problemas en Chrome y Edge relacionados con la revocación inmediata de object URLs
 * y descargas asíncronas bloqueadas.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Revocar la URL después de un retraso seguro para permitir que Chrome complete la descarga
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 5000);
}

export function generateAlumnosPDF(entries: any[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // ── Encabezado ──────────────────────────────────────────────
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, 297, 30, 'F');

  doc.setFontSize(18);
  doc.setTextColor(249, 115, 22); // sud-orange
  doc.setFont('helvetica', 'bold');
  doc.text('SUDTALENT', 14, 13);

  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.setFont('helvetica', 'normal');
  doc.text('Gestión de Alumnos — Reporte de Lista de Acceso', 14, 21);

  const now = new Date().toLocaleDateString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  doc.text(`Generado: ${now}`, 297 - 14, 21, { align: 'right' });

  // ── Estadísticas rápidas ─────────────────────────────────────
  const total = entries.length;
  const aprobados = entries.filter(e => e.status === 'APPROVED').length;
  const enRevision = entries.filter(e => e.status === 'PENDING' || (!e.status && e.type === 'REGISTERED')).length;
  const sinRegistrar = entries.filter(e => !e.uid).length;

  const stats = [
    { label: 'Total Alumnos', value: total },
    { label: 'Aprobados', value: aprobados },
    { label: 'En Revisión', value: enRevision },
    { label: 'Sin Registrar', value: sinRegistrar },
  ];

  let sx = 14;
  const sy = 36;
  stats.forEach(s => {
    doc.setFillColor(20, 20, 20);
    doc.roundedRect(sx, sy, 60, 16, 3, 3, 'F');
    doc.setFontSize(16);
    doc.setTextColor(249, 115, 22);
    doc.setFont('helvetica', 'bold');
    doc.text(String(s.value), sx + 30, sy + 9, { align: 'center' });
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(s.label.toUpperCase(), sx + 30, sy + 14, { align: 'center' });
    sx += 65;
  });

  // ── Tabla ────────────────────────────────────────────────────
  const rows = entries.map(e => [
    e.name || 'Sin nombre',
    e.email || '—',
    formatPhone(e.phone),
    STATUS_LABEL[e.status || ''] || (e.uid ? 'En Revisión' : 'Sin registrar'),
    CATEGORY_LABEL[e.category || ''] || '—',
    formatDate(e.addedAt),
  ]);

  autoTable(doc, {
    startY: 58,
    head: [['Nombre', 'Correo', 'Teléfono', 'Estado', 'Categoría', 'Fecha Registro']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [249, 115, 22],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 30, 30],
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 65 },
      2: { cellWidth: 42 },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 28, halign: 'center' },
      5: { cellWidth: 35, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
    didDrawCell: (data) => {
      // Colorear el estado
      if (data.column.index === 3 && data.section === 'body') {
        const val = data.cell.text[0];
        if (val === 'Aprobado') {
          doc.setFillColor(45, 212, 191, 0.15);
        } else if (val === 'Inactivo') {
          doc.setFillColor(239, 68, 68, 0.15);
        }
      }
    },
  });

  // ── Pie de página ─────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount}`, 297 / 2, 205, { align: 'center' });
    doc.text('SudTalent — Documento confidencial', 14, 205);
  }

  // En lugar de doc.save(), generamos el blob con tipo mime correcto y usamos downloadBlob
  const pdfBlob = doc.output('blob');
  downloadBlob(pdfBlob, `sudtalent-alumnos-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function generateAlumnosExcel(data: any[]) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Alumnos');
  
  // Ajustar el ancho de las columnas de forma automática
  const maxProps = Object.keys(data[0] || {});
  worksheet['!cols'] = maxProps.map(key => ({
    wch: Math.max(key.length + 2, ...data.map(row => String(row[key] || '').length + 2))
  }));

  // Escribimos el libro de trabajo en memoria como un ArrayBuffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  // Envolvemos el ArrayBuffer en un Blob con el tipo MIME correcto para archivos .xlsx de Excel
  const excelBlob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  // Descargamos usando downloadBlob para una descarga segura y robusta en Chrome
  downloadBlob(excelBlob, `sudtalent-alumnos-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
