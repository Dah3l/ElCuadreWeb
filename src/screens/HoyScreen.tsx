import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../App';

export default function HoyScreen() {
  const { session, exchangeRate, navigateTo } = useApp();
  const [ventasHoy, setVentasHoy] = useState<number>(0);
  const [gastosHoy, setGastosHoy] = useState<number>(0);
  const [ventasCount, setVentasCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) loadData();
  }, [session]);

  const loadData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    const { data: ventas } = await supabase
      .from('sales')
      .select('total, currency')
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
    let totalGastosCUP = 0;

    (ventas || []).forEach(v => {
      if (v.currency === 'USD') totalVentasCUP += v.total * exchangeRate;
      else totalVentasCUP += v.total;
    });

    (gastos || []).forEach(g => {
      if (g.currency === 'USD') totalGastosCUP += g.amount * exchangeRate;
      else totalGastosCUP += g.amount;
    });

    setVentasHoy(totalVentasCUP);
    setGastosHoy(totalGastosCUP);
    setVentasCount(ventas?.length || 0);
    setLoading(false);
  };

  const ganancia = ventasHoy - gastosHoy;

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando resumen...</div>;
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
          <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
            {ventasHoy.toLocaleString()}
          </p>
          <p className="text-xs text-green-500 dark:text-green-400">CUP ({ventasCount} ventas)</p>
        </button>

        <button
          onClick={() => navigateTo('gastos')}
          className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-left hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors active:scale-95"
        >
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">💸 Gastos</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
            {gastosHoy.toLocaleString()}
          </p>
          <p className="text-xs text-red-500 dark:text-red-400">CUP</p>
        </button>
      </div>

      <div className={`rounded-xl p-4 border ${ganancia >= 0 ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800'}`}>
        <p className={`text-xs font-medium ${ganancia >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
          📊 Ganancia del día
        </p>
        <p className={`text-3xl font-bold mt-1 ${ganancia >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
          {ganancia >= 0 ? '+' : ''}{ganancia.toLocaleString()} CUP
        </p>
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
  const [lowStock, setLowStock] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from('products')
      .select('name, stock')
      .eq('user_id', userId)
      .lte('stock', 5)
      .then(({ data }) => {
        if (data) setLowStock(data.map(p => `${p.name} (${p.stock})`));
      });
  }, [userId]);

  if (lowStock.length === 0) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mt-4">
      <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-2">⚠️ Stock bajo</p>
      <ul className="text-xs text-yellow-600 dark:text-yellow-300 space-y-1">
        {lowStock.map((item, i) => (
          <li key={i}>• {item} unidades</li>
        ))}
      </ul>
    </div>
  );
}
