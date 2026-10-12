import { useState, useEffect } from 'react';
import { supabase, getErrorMessage } from '../lib/supabase';
import { useApp } from '../App';

interface CashClosure {
  id: string;
  date: string;
  expected_amount: number;
  actual_amount: number;
  notes: string;
  user_name?: string;
}

export default function CajaScreen() {
  const { session, exchangeRate, userName, userEmail } = useApp();
  const [closures, setClosures] = useState<CashClosure[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [actualAmount, setActualAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [expectedAmount, setExpectedAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) {
      loadClosures();
      calculateExpected();
    }
  }, [session]);

  const loadClosures = async () => {
    const { data } = await supabase
      .from('cash_closures')
      .select('*')
      .eq('user_id', session!.user.id)
      .order('date', { ascending: false })
      .limit(30);
    if (data) setClosures(data as CashClosure[]);
    setLoading(false);
  };

  const calculateExpected = async () => {
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

    let totalVentas = 0;
    let totalGastos = 0;

    (ventas || []).forEach(v => {
      if (v.currency === 'USD') totalVentas += v.total * exchangeRate;
      else totalVentas += v.total;
    });
    (gastos || []).forEach(g => {
      if (g.currency === 'USD') totalGastos += g.amount * exchangeRate;
      else totalGastos += g.amount;
    });

    setExpectedAmount(totalVentas - totalGastos);
  };

  const saveClosure = async () => {
    if (!actualAmount) { setError('Ingresa el monto contado'); return; }
    setError('');

    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('cash_closures').insert({
      user_id: session!.user.id,
      user_name: userName || userEmail,
      date: today,
      expected_amount: expectedAmount,
      actual_amount: parseFloat(actualAmount),
      notes: notes.trim(),
    });

    if (error) { setError(getErrorMessage(error)); return; }

    setActualAmount(''); setNotes(''); setShowForm(false);
    loadClosures();
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Cargando caja...</div>;

  const diferencia = actualAmount ? parseFloat(actualAmount) - expectedAmount : 0;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Cierre de Caja</h2>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {showForm ? '✕ Cerrar' : '+ Cierre'}
        </button>
      </div>

      {/* Today's summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Resumen de Hoy</h3>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">Monto esperado:</span>
          <span className="font-bold text-gray-800 dark:text-white">{expectedAmount.toLocaleString()} CUP</span>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 text-xs text-gray-400">
          (Ventas del día - Gastos del día, todo en CUP)
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">⚠️ {error}</div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3 animate-slide-up">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">Cerrar Caja de Hoy</h3>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Monto esperado (calculado)</label>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{expectedAmount.toLocaleString()} CUP</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Monto real contado (CUP)</label>
            <input
              type="number" value={actualAmount} onChange={e => setActualAmount(e.target.value)}
              placeholder="Lo que tienes en caja"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500 mt-1"
            />
          </div>
          {actualAmount && (
            <div className={`p-2 rounded-lg text-sm font-medium ${diferencia >= 0 ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
              Diferencia: {diferencia >= 0 ? '+' : ''}{diferencia.toLocaleString()} CUP
            </div>
          )}
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notas (opcional)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={saveClosure} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold text-sm transition-colors">
            ✓ Guardar Cierre
          </button>
        </div>
      )}

      {/* History */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Historial</h3>
        {closures.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <p className="text-sm">No hay cierres registrados</p>
          </div>
        )}
        {closures.map(c => {
          const diff = c.actual_amount - c.expected_amount;
          return (
            <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {new Date(c.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    {c.user_name && <span className="ml-2 text-blue-500 text-xs">· 👤 {c.user_name}</span>}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Esperado: {c.expected_amount.toLocaleString()} · Contado: {c.actual_amount.toLocaleString()}
                  </p>
                </div>
                <span className={`text-sm font-bold ${diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {diff >= 0 ? '+' : ''}{diff.toLocaleString()}
                </span>
              </div>
              {c.notes && <p className="text-xs text-gray-400 mt-1 italic">"{c.notes}"</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
