import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../App';
import { formatMoney, toCUP, exportToCSV } from '../lib/utils';
import { exportToPDF } from '../lib/pdf';

type Period = 'day' | 'week' | 'month';

interface SaleItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  cost: number;
}

export default function ReportesScreen() {
  const { session, exchangeRate, storeName } = useApp();
  const [period, setPeriod] = useState<Period>('week');
  const [profitData, setProfitData] = useState<{ label: string; profit: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; qty: number; revenue: number; cost: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalVentasCUP: 0,
    totalVentasUSD: 0,
    totalGastosCUP: 0,
    totalGastosUSD: 0,
    totalCosto: 0,
    gananciaNeta: 0,
    ventasBrutas: 0,
  });
  const [allSales, setAllSales] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef2 = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (session) loadReportData();
  }, [session, period]);

  useEffect(() => {
    drawChart(canvasRef.current, profitData, '#3b82f6');
  }, [profitData]);

  useEffect(() => {
    drawChart(canvasRef2.current, topProducts.map(p => ({ label: p.name, profit: p.qty })), '#059669');
  }, [topProducts]);

  const loadReportData = async () => {
    setLoading(true);
    const now = new Date();
    let startDate: Date;

    if (period === 'day') {
      startDate = new Date(now); startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate = new Date(now); startDate.setDate(now.getDate() - 6); startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now); startDate.setDate(1); startDate.setHours(0, 0, 0, 0);
    }

    const { data: ventas } = await supabase
      .from('sales')
      .select('total, currency, items, created_at')
      .eq('user_id', session!.user.id)
      .gte('created_at', startDate.toISOString());

    const { data: gastos } = await supabase
      .from('expenses')
      .select('amount, currency, created_at')
      .eq('user_id', session!.user.id)
      .gte('created_at', startDate.toISOString());

    setAllSales(ventas || []);
    setAllExpenses(gastos || []);

    // Group by date
    const dailyData: { [key: string]: { ventas: number; gastos: number; costo: number } } = {};

    let totalVentasCUP = 0, totalVentasUSD = 0;
    let totalGastosCUP = 0, totalGastosUSD = 0;
    let totalCosto = 0;

    (ventas || []).forEach(v => {
      const date = v.created_at.split('T')[0];
      if (!dailyData[date]) dailyData[date] = { ventas: 0, gastos: 0, costo: 0 };
      
      const amount = toCUP(v.total, v.currency as 'CUP' | 'USD', exchangeRate);
      dailyData[date].ventas += amount;
      
      if (v.currency === 'USD') totalVentasUSD += v.total;
      else totalVentasCUP += v.total;

      // Calcular costo de productos vendidos
      const items = v.items as SaleItem[];
      if (items) {
        items.forEach(item => {
          const cost = item.cost || 0;
          const costInCUP = v.currency === 'USD' ? cost * item.quantity * exchangeRate : cost * item.quantity;
          dailyData[date].costo += costInCUP;
          totalCosto += costInCUP;
        });
      }
    });

    (gastos || []).forEach(g => {
      const date = g.created_at.split('T')[0];
      if (!dailyData[date]) dailyData[date] = { ventas: 0, gastos: 0, costo: 0 };
      const amount = toCUP(g.amount, g.currency as 'CUP' | 'USD', exchangeRate);
      dailyData[date].gastos += amount;
      
      if (g.currency === 'USD') totalGastosUSD += g.amount;
      else totalGastosCUP += g.amount;
    });

    const sortedDates = Object.keys(dailyData).sort();
    const profitResult = sortedDates.map(date => ({
      label: new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      profit: dailyData[date].ventas - dailyData[date].gastos - dailyData[date].costo,
    }));

    setProfitData(profitResult);

    // Top products
    const productStats: { [key: string]: { qty: number; revenue: number; cost: number } } = {};
    (ventas || []).forEach(v => {
      const items = v.items as SaleItem[];
      if (items) {
        items.forEach(item => {
          if (!productStats[item.name]) productStats[item.name] = { qty: 0, revenue: 0, cost: 0 };
          productStats[item.name].qty += item.quantity;
          const revenue = v.currency === 'USD' ? item.price * item.quantity * exchangeRate : item.price * item.quantity;
          const cost = v.currency === 'USD' ? (item.cost || 0) * item.quantity * exchangeRate : (item.cost || 0) * item.quantity;
          productStats[item.name].revenue += revenue;
          productStats[item.name].cost += cost;
        });
      }
    });

    const sorted = Object.entries(productStats)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 8)
      .map(([name, stats]) => ({ name, ...stats }));

    setTopProducts(sorted);

    const ventasBrutas = totalVentasCUP + (totalVentasUSD * exchangeRate);
    const gastosTotal = totalGastosCUP + (totalGastosUSD * exchangeRate);
    const gananciaNeta = ventasBrutas - totalCosto - gastosTotal;

    setSummary({
      totalVentasCUP,
      totalVentasUSD,
      totalGastosCUP,
      totalGastosUSD,
      totalCosto,
      gananciaNeta,
      ventasBrutas,
    });

    setLoading(false);
  };

  const drawChart = (canvas: HTMLCanvasElement | null, data: { label: string; profit: number }[], color: string) => {
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 10, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const maxVal = Math.max(...data.map(d => Math.abs(d.profit)), 1);
    const barWidth = Math.min(chartWidth / data.length * 0.7, 40);
    const gap = chartWidth / data.length;

    // Grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      const val = Math.round(maxVal - (maxVal / 4) * i);
      ctx.fillText(val.toLocaleString(), padding.left - 5, y + 3);
    }

    // Bars
    data.forEach((d, i) => {
      const x = padding.left + gap * i + (gap - barWidth) / 2;
      const barHeight = (Math.abs(d.profit) / maxVal) * chartHeight;
      const y = d.profit >= 0
        ? padding.top + chartHeight - barHeight
        : padding.top + chartHeight;

      ctx.fillStyle = d.profit >= 0 ? color : '#ef4444';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 3);
      ctx.fill();

      // Label
      ctx.fillStyle = '#6b7280';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + barWidth / 2, height - padding.bottom + 15);
    });
  };

  const handleExportCSV = () => {
    const periodLabel = period === 'day' ? 'Hoy' : period === 'week' ? 'Semana' : 'Mes';
    
    // Ventas
    const ventasRows = allSales.map(s => ({
      fecha: new Date(s.created_at).toLocaleString('es-ES'),
      total: s.total,
      moneda: s.currency,
      items: (s.items as SaleItem[]).map(i => `${i.name} x${i.quantity}`).join('; '),
    }));
    exportToCSV(`${storeName}_ventas_${periodLabel}`, ventasRows);

    // Gastos
    const gastosRows = allExpenses.map(g => ({
      fecha: new Date(g.created_at).toLocaleString('es-ES'),
      concepto: g.concept,
      monto: g.amount,
      moneda: g.currency,
    }));
    exportToCSV(`${storeName}_gastos_${periodLabel}`, gastosRows);
  };

  const handleExportPDF = async () => {
    const periodLabel = period === 'day' ? 'Hoy' : period === 'week' ? 'Semana' : 'Mes';
    const title = `Reporte ${periodLabel} - ${storeName}`;
    
    const data = [
      { label: 'Total Ventas (brutas)', value: formatMoney(summary.ventasBrutas, 'CUP') },
      { label: 'Ventas CUP', value: formatMoney(summary.totalVentasCUP, 'CUP') },
      { label: 'Ventas USD', value: formatMoney(summary.totalVentasUSD, 'USD') },
      { label: 'Total Gastos', value: formatMoney(summary.totalGastosCUP + summary.totalGastosUSD * exchangeRate, 'CUP') },
      { label: 'Costo productos vendidos', value: formatMoney(summary.totalCosto, 'CUP') },
      { label: 'Ganancia neta', value: formatMoney(summary.gananciaNeta, 'CUP') },
    ];

    const tableData = {
      headers: ['Producto', 'Cantidad', 'Ingreso', 'Costo'],
      rows: topProducts.map(p => [
        p.name,
        String(p.qty),
        formatMoney(p.revenue, 'CUP'),
        formatMoney(p.cost, 'CUP'),
      ]),
    };

    await exportToPDF(title, data, tableData);
  };

  if (loading) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Cargando reportes...</div>;

  return (
    <div className="animate-fade-in space-y-4">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white">Reportes</h2>

      {/* Period selector */}
      <div className="flex gap-2">
        {([['day', 'Hoy'], ['week', 'Semana'], ['month', 'Mes']] as [Period, string][]).map(([p, label]) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${period === p ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Resumen con desglose */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">📋 Desglose del período</h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Ventas CUP:</span>
            <span className="text-green-600 dark:text-green-400">+{formatMoney(summary.totalVentasCUP, 'CUP')}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Ventas USD:</span>
            <span className="text-green-600 dark:text-green-400">+{formatMoney(summary.totalVentasUSD, 'USD')} ({formatMoney(summary.totalVentasUSD * exchangeRate, 'CUP')})</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-700 dark:text-gray-200 border-t border-gray-200 dark:border-gray-600 pt-1">
            <span>Total ventas (brutas):</span>
            <span className="text-green-600 dark:text-green-400">{formatMoney(summary.ventasBrutas, 'CUP')}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Costo productos vendidos:</span>
            <span className="text-orange-600 dark:text-orange-400">-{formatMoney(summary.totalCosto, 'CUP')}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Gastos CUP:</span>
            <span className="text-red-600 dark:text-red-400">-{formatMoney(summary.totalGastosCUP, 'CUP')}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Gastos USD:</span>
            <span className="text-red-600 dark:text-red-400">-{formatMoney(summary.totalGastosUSD, 'USD')} (-{formatMoney(summary.totalGastosUSD * exchangeRate, 'CUP')})</span>
          </div>
          <div className="flex justify-between font-bold text-gray-800 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
            <span>Ganancia neta:</span>
            <span className={summary.gananciaNeta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {formatMoney(summary.gananciaNeta, 'CUP')}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            Fórmula: Ventas − Costo productos − Gastos = Ganancia neta
          </p>
        </div>
      </div>

      {/* Profit Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">📊 Ganancia neta por día</h3>
        {profitData.length > 0 ? (
          <canvas
            ref={canvasRef}
            className="w-full"
            style={{ height: '200px' }}
          />
        ) : (
          <p className="text-center py-8 text-gray-400 text-sm">Sin datos para este período</p>
        )}
      </div>

      {/* Top Products */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">🏆 Productos más vendidos</h3>
        {topProducts.length > 0 ? (
          <>
            <canvas
              ref={canvasRef2}
              className="w-full"
              style={{ height: '180px' }}
            />
            <div className="mt-3 space-y-1">
              {topProducts.map((p, i) => (
                <div key={i} className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
                  <span>{i + 1}. {p.name}</span>
                  <span className="font-medium">{p.qty} uds · {formatMoney(p.revenue, 'CUP')}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-center py-6 text-gray-400 text-sm">Sin ventas en este período</p>
        )}
      </div>

      {/* Export buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleExportCSV}
          disabled={allSales.length === 0 && allExpenses.length === 0}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          📊 Exportar CSV
        </button>
        <button
          onClick={handleExportPDF}
          disabled={profitData.length === 0}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          📄 Exportar PDF
        </button>
      </div>
    </div>
  );
}
