import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../App';
import { formatMoney, toCUP } from '../lib/utils';

interface SaleItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  cost?: number;
}

export default function HoyScreen() {
  const { session, exchangeRate, navigateTo, settingsLoaded } = useApp();
  const [ventasHoy, setVentasHoy] = useState<number>(0);
  const [gastosHoy, setGastosHoy] = useState<number>(0);
  const [costoVentas, setCostoVentas] = useState<number>(0);
  const [ventasCount, setVentasCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState({ ventasCUP: 0, ventasUSD: 0, gastosCUP: 0, gastosUSD: 0 });

  useEffect(() => {
    // Solo cargar datos cuando settings estén listos (evita race condition)
    if (session && settingsLoaded) loadData();
  }, [session, settingsLoaded]);

  const loadData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    const { data: ventas } = await supabase
      .from('sales')
      .select('total, currency, items')
      .eq('user_id', session!.user.id)
      .gte('created_at', today + 'T00:00:00')
      .lte('created_at', today + 'T23:59:59');

    const { data: gastos } = await supabase
      .from('expenses')
      .select('amount, currency')
      .eq('user_id', session!.user.id)
      .gte('created_at', today + 'T00:00:00')
      .lte('created_at', today + 'T23:59:59');

    let totalVentasCUP = 0;
    let totalVentasUSD = 0;
    let totalGastosCUP = 0;
    let totalGastosUSD = 0;
    let totalCosto = 0;

    (ventas || []).forEach(v => {
      if (v.currency === 'USD') totalVentasUSD += v.total;
      else totalVentasCUP += v.total;

      // Calcular costo de productos vendidos
      const items = v.items as SaleItem[];
      if (items) {
        items.forEach(item => {
          const cost = item.cost || 0;
          if (v.currency === 'USD') {
            totalCosto += cost * item.quantity * exchangeRate;
          } else {
            totalCosto += cost * item.quantity;
          }
        });
      }
    });

    (gastos || []).forEach(g => {
      if (g.currency === 'USD') totalGastosUSD += g.amount;
      else totalGastosCUP += g.amount;
    });

    setVentasHoy(toCUP(totalVentasCUP, 'CUP', exchangeRate) + toCUP(totalVentasUSD, 'USD', exchangeRate));
    setGastosHoy(toCUP(totalGastosCUP, 'CUP', exchangeRate) + toCUP(totalGastosUSD, 'USD', exchangeRate));
    setCostoVentas(totalCosto);
    setVentasCount(ventas?.length || 0);
    setBreakdown({ ventasCUP: totalVentasCUP, ventasUSD: totalVentasUSD, gastosCUP: totalGastosCUP, gastosUSD: totalGastosUSD });
    setLoading(false);
  };

  // Ganancia neta = Ventas - Costo de productos vendidos - Gastos
  const ganancia = ventasHoy - costoVentas - gastosHoy;

  if (loading) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Cargando resumen...</div>;
  }

  return (
    <div className="animate-fade-in space-y-4">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white">Resumen de Hoy</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigateTo('ventas')}
          className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4 text-left hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors active:scale-95"
        >
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">💰 Ventas</p>
          <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-1">
            {formatMoney(ventasHoy, 'CUP')}
          </p>
          <p className="text-xs text-green-500 dark:text-green-400">{ventasCount} ventas</p>
        </button>

        <button
          onClick={() => navigateTo('gastos')}
          className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-left hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors active:scale-95"
        >
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">💸 Gastos</p>
          <p className="text-xl font-bold text-red-700 dark:text-red-300 mt-1">
            {formatMoney(gastosHoy, 'CUP')}
          </p>
        </button>
      </div>

      {/* Costo de ventas */}
      <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-xl p-3">
        <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">📦 Costo de productos vendidos</p>
        <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{formatMoney(costoVentas, 'CUP')}</p>
      </div>

      {/* Ganancia neta */}
      <div className={`rounded-xl p-4 border ${ganancia >= 0 ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800'}`}>
        <p className={`text-xs font-medium ${ganancia >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
          📊 Ganancia neta del día
        </p>
        <p className={`text-2xl font-bold mt-1 ${ganancia >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
          {ganancia >= 0 ? '+' : ''}{formatMoney(ganancia, 'CUP')}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          = Ventas − Costo productos − Gastos
        </p>
      </div>

      {/* Desglose */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">📋 Desglose</h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Ventas CUP:</span>
            <span>{formatMoney(breakdown.ventasCUP, 'CUP')}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Ventas USD:</span>
            <span>{formatMoney(breakdown.ventasUSD, 'USD')} ({formatMoney(breakdown.ventasUSD * exchangeRate, 'CUP')})</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Gastos CUP:</span>
            <span>-{formatMoney(breakdown.gastosCUP, 'CUP')}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Gastos USD:</span>
            <span>-{formatMoney(breakdown.gastosUSD, 'USD')} (-{formatMoney(breakdown.gastosUSD * exchangeRate, 'CUP')})</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Costo productos:</span>
            <span>-{formatMoney(costoVentas, 'CUP')}</span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-600 pt-1 mt-1 flex justify-between font-semibold text-gray-800 dark:text-white">
            <span>Ganancia neta:</span>
            <span className={ganancia >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {formatMoney(ganancia, 'CUP')}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Acciones rápidas</h3>
        <button
          onClick={() => navigateTo('ventas')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl text-lg transition-colors shadow-md active:scale-95"
        >
          💰 Nueva Venta
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigateTo('gastos')}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
          >
            💸 Registrar Gasto
          </button>
          <button
            onClick={() => navigateTo('fiados')}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
          >
            📝 Ver Fiados
          </button>
        </div>
      </div>

      {/* Stock bajo alert */}
      <StockAlert userId={session!.user.id} />
    </div>
  );
}

function StockAlert({ userId }: { userId: string }) {
  const [lowStock, setLowStock] = useState<{ name: string; stock: number }[]>([]);

  useEffect(() => {
    supabase
      .from('products')
      .select('name, stock')
      .eq('user_id', userId)
      .lte('stock', 5)
      .then(({ data }) => {
        if (data) setLowStock(data);
      });
  }, [userId]);

  if (lowStock.length === 0) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mt-4">
      <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-2">⚠️ Stock bajo</p>
      <ul className="text-xs text-yellow-600 dark:text-yellow-300 space-y-1">
        {lowStock.map((item, i) => (
          <li key={i}>• {item.name} ({item.stock} unidades)</li>
        ))}
      </ul>
    </div>
  );
}
