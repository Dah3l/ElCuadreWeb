// Utilidades compartidas para El Cuadre

// ============================================================
// Formato de moneda unificado (Bug #15)
// ============================================================
export function formatMoney(amount: number, currency: 'CUP' | 'USD' = 'CUP'): string {
  const symbol = currency === 'CUP' ? '$' : 'US$';
  const formatted = amount.toLocaleString('es-CU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted} ${currency}`;
}

export function formatMoneyShort(amount: number, currency: 'CUP' | 'USD' = 'CUP'): string {
  const symbol = currency === 'CUP' ? '$' : 'US$';
  const formatted = amount.toLocaleString('es-CU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${symbol}${formatted}`;
}

// ============================================================
// Conversión de monedas
// ============================================================
export function toCUP(amount: number, currency: 'CUP' | 'USD', rate: number): number {
  return currency === 'USD' ? amount * rate : amount;
}

// ============================================================
// Exportar a CSV
// ============================================================
export function exportToCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  
  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join(','),
    ...rows.map(row => 
      headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? '' : String(val);
        // Escapar comillas y envolver si contiene comas
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    )
  ];
  
  const csvContent = csvRows.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// Fechas
// ============================================================
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTimeDisplay(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
