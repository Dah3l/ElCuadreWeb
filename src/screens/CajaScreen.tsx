import { useState, useEffect } from 'react';
import { supabase, getErrorMessage } from '../lib/supabase';
import { useApp } from '../App';
import { useToast } from '../components/Toast';
import { formatMoney, getTodayISO, formatTimeDisplay } from '../lib/utils';

interface CashClosure {
  id: string;
  date: string;
  opening_amount: number;
  opening_notes: string;
  sales_cup: number;
  sales_usd: number;
  expenses_cup: number;
  expenses_usd: number;
  expected_amount: number;
  actual_cup: number;
  actual_usd: number;
  actual_amount: number;
  notes: string;
  user_name?: string;
}

export default function CajaScreen() {
  const { session, exchangeRate } = useApp();
  const { showToast } = useToast();
  const [closures, setClosures] = useState<CashClosure[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('0');
  const [openingNotes, setOpeningNotes] = useState('');
  const [actualCUP, setActualCUP] = useState('');
  const [actualUSD, setActualUSD] = useState('');
  const [notes, setNotes] = useState('');
  const [todayStats, setTodayStats] = useState({
    salesCUP: 0, salesUSD: 0, expensesCUP: 0, expensesUSD: 0, expected: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) {
      loadClosures();
      calculateTodayStats();
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

  const calculateTodayStats = async () => {
    const today = getTodayISO();

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

    let salesCUP = 0, salesUSD = 0, expensesCUP = 0, expensesUSD = 0;

    (ventas || []).forEach(v => {
      if (v.currency === 'USD') salesUSD += v.total;
      else salesCUP += v.total;
    });

    (gastos || []).forEach(g => {
      if (g.currency === 'USD') expensesUSD += g.amount;
      else expensesCUP += g.amount;
    });

    // Expected = opening + ventas - gastos (todo en CUP)
    const opening = parseFloat(openingAmount) || 0;
    const expected = opening + salesCUP + (salesUSD * exchangeRate) - expensesCUP - (expensesUSD * exchangeRate);

    setTodayStats({ salesCUP, salesUSD, expensesCUP, expensesUSD, expected });
  };

  useEffect(() => {
    if (session) calculateTodayStats();
  }, [openingAmount, exchangeRate]);

  const saveClosure = async () => {
    setError('');
    const today = getTodayISO();
    const actualCupNum = parseFloat(actualCUP) || 0;
    const actualUsdNum = parseFloat(actualUSD) || 0;
    const actualTotal = actualCupNum + (actualUsdNum * exchangeRate);

    const { error } = await supabase.from('cash_closures').insert({
      user_id: session!.user.id,
      user_name: '',
      date: today,
      opening_amount: parseFloat(openingAmount) || 0,
      opening_notes: openingNotes.trim(),
      sales_cup: todayStats.salesCUP,
      sales_usd: todayStats.salesUSD,
      expenses_cup: todayStats.expensesCUP,
      expenses_usd: todayStats.expensesUSD,
      expected_amount: todayStats.expected,
      actual_cup: actualCupNum,
      actual_usd: actualUsdNum,
      actual_amount: actualTotal,
      notes: notes.trim(),
    });

    if (error) { setError(getErrorMessage(error)); return; }

    setOpeningAmount('0'); setOpeningNotes(''); setActualCUP(''); setActualUSD(''); setNotes('');
    setShowForm(false);
    showToast('✓ Cierre de caja guardado', 'success');
    loadClosures();
  };

  if (loading) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Cargando caja...</div>;

  const actualCupNum = parseFloat(actualCUP) || 0;
  const actualUsdNum = parseFloat(actualUSD) || 0;
  const actualTotal = actualCupNum + (actualUsdNum * exchangeRate);
  const diferencia = actualTotal - todayStats.expected;

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
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">📊 Resumen de Hoy</h3>
        
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Ventas CUP:</span>
            <span className="text-green-600 dark:text-green-400">+{formatMoney(todayStats.salesCUP, 'CUP')}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Ventas USD:</span>
            <span className="text-green-600 dark:text-green-400">+{formatMoney(todayStats.salesUSD, 'USD')} ({formatMoney(todayStats.salesUSD * exchangeRate, 'CUP')})</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Gastos CUP:</span>
            <span className="text-red-600 dark:text-red-400">-{formatMoney(todayStats.expensesCUP, 'CUP')}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Gastos USD:</span>
            <span className="text-red-600 dark:text-red-400">-{formatMoney(todayStats.expensesUSD, 'USD')} (-{formatMoney(todayStats.expensesUSD * exchangeRate, 'CUP')})</span>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Monto esperado:</span>
            <span className="font-bold text-gray-800 dark:text-white">{formatMoney(todayStats.expected, 'CUP')}</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            (Apertura + Ventas − Gastos, todo en CUP)
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">⚠️ {error}</div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3 animate-slide-up">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">Cerrar Caja de Hoy</h3>
          
          {/* Apertura */}
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 space-y-2">
            <label className="text-xs font-medium text-blue-700 dark:text-blue-300">💵 Fondo inicial / Apertura</label>
            <input
              type="number" value={openingAmount} onChange={e => setOpeningAmount(e.target.value)}
              placeholder="0" min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={openingNotes} onChange={e => setOpeningNotes(e.target.value)}
              placeholder="Notas de apertura (opcional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Expected */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Monto esperado (calculado)</label>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatMoney(todayStats.expected, 'CUP')}</p>
          </div>

          {/* Contado */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-200">💰 Monto contado (desglose por moneda)</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">CUP</label>
                <input
                  type="number" value={actualCUP} onChange={e => setActualCUP(e.target.value)}
                  placeholder="0" min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">USD</label>
                <input
                  type="number" value={actualUSD} onChange={e => setActualUSD(e.target.value)}
                  placeholder="0" min="0" step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">Total en CUP: {formatMoney(actualTotal, 'CUP')}</p>
          </div>

          {actualCUP || actualUSD ? (
            <div className={`p-2 rounded-lg text-sm font-medium ${diferencia >= 0 ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
              Diferencia: {diferencia >= 0 ? '+' : ''}{formatMoney(diferencia, 'CUP')}
            </div>
          ) : null}

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
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {new Date(c.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    {c.user_name && <span className="ml-2 text-blue-500 text-xs">· 👤 {c.user_name}</span>}
                  </p>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                    <p>Apertura: {formatMoney(c.opening_amount || 0, 'CUP')}</p>
                    <p>Esperado: {formatMoney(c.expected_amount, 'CUP')} · Contado: {formatMoney(c.actual_amount, 'CUP')}</p>
                    {(c.actual_cup || c.actual_usd) ? (
                      <p className="text-gray-400">Desglose: {formatMoney(c.actual_cup || 0, 'CUP')} + {formatMoney(c.actual_usd || 0, 'USD')}</p>
                    ) : null}
                  </div>
                </div>
                <span className={`text-sm font-bold ${diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {diff >= 0 ? '+' : ''}{formatMoney(diff, 'CUP')}
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
