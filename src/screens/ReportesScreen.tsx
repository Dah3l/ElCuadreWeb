import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../App';

type Period = 'day' | 'week' | 'month';

export default function ReportesScreen() {
  const { session, exchangeRate } = useApp();
  const [period, setPeriod] = useState<Period>('week');
  const [profitData, setProfitData] = useState<{ label: string; profit: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; qty: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef2 = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (session) loadReportData();
  }, [session, period]);

  useEffect(() => {
    drawChart(canvasRef.current, profitData, 'Ganancia (CUP)', '#3b82f6');
  }, [profitData]);

  useEffect(() => {
    drawChart(canvasRef2.current, topProducts.map(p => ({ label: p.name, profit: p.qty })), 'Unidades vendidas', '#059669');
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

    // Group by date
    const dailyData: { [key: string]: { ventas: number; gastos: number } } = {};

    (ventas || []).forEach(v => {
      const date = v.created_at.split('T')[0];
      if (!dailyData[date]) dailyData[date] = { ventas: 0, gastos: 0 };
      const amount = v.currency === 'USD' ? v.total * exchangeRate : v.total;
      dailyData[date].ventas += amount;
    });

    (gastos || []).forEach(g => {
      const date = g.created_at.split('T')[0];
      if (!dailyData[date]) dailyData[date] = { ventas: 0, gastos: 0 };
      const amount = g.currency === 'USD' ? g.amount * exchangeRate : g.amount;
      dailyData[date].gastos += amount;
    });

    const sortedDates = Object.keys(dailyData).sort();
    const profitResult = sortedDates.map(date => ({
      label: new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      profit: dailyData[date].ventas - dailyData[date].gastos,
    }));

    setProfitData(profitResult);

    // Top products
    const productCount: { [key: string]: number } = {};
    (ventas || []).forEach(v => {
      const items = v.items as { name: string; quantity: number }[];
      if (items) {
        items.forEach(item => {
          productCount[item.name] = (productCount[item.name] || 0) + item.quantity;
        });
      }
    });

    const sorted = Object.entries(productCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, qty]) => ({ name, qty }));

    setTopProducts(sorted);
    setLoading(false);
  };

  const drawChart = (canvas: HTMLCanvasElement | null, data: { label: string; profit: number }[], label: string, color: string) => {
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

  if (loading) return <div className="text-center py-8 text-gray-500">Cargando reportes...</div>;

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

      {/* Profit Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">📊 Ganancia por día</h3>
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
                  <span className="font-medium">{p.qty} uds</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-center py-6 text-gray-400 text-sm">Sin ventas en este período</p>
        )}
      </div>

      {/* Summary stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">📋 Resumen</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Total ventas:</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {profitData.reduce((s, d) => s + (d.profit > 0 ? d.profit : 0), 0).toLocaleString()} CUP
            </span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Ganancia neta:</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {profitData.reduce((s, d) => s + d.profit, 0).toLocaleString()} CUP
            </span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Productos vendidos:</span>
            <span className="font-medium">{topProducts.reduce((s, p) => s + p.qty, 0)} unidades</span>
          </div>
        </div>
      </div>
    </div>
  );
}
