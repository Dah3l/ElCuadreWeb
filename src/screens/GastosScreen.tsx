import { useState, useEffect } from 'react';
import { supabase, getErrorMessage } from '../lib/supabase';
import { useApp } from '../App';

interface Expense {
  id: string;
  created_at: string;
  concept: string;
  amount: number;
  currency: string;
}

export default function GastosScreen() {
  const { session } = useApp();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'CUP' | 'USD'>('CUP');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) loadExpenses();
  }, [session]);

  const loadExpenses = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', session!.user.id)
      .gte('created_at', today + 'T00:00:00')
      .order('created_at', { ascending: false });
    if (!error && data) setExpenses(data as Expense[]);
    setLoading(false);
  };

  const saveExpense = async () => {
    if (!concept.trim() || !amount) { setError('Concepto y monto son obligatorios'); return; }
    setError('');

    const { error } = await supabase.from('expenses').insert({
      user_id: session!.user.id,
      concept: concept.trim(),
      amount: parseFloat(amount),
      currency,
    });

    if (error) { setError(getErrorMessage(error)); return; }

    setConcept(''); setAmount(''); setShowForm(false);
    loadExpenses();
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    loadExpenses();
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Cargando gastos...</div>;

  const totalHoy = expenses.reduce((sum, e) => sum + (e.currency === 'USD' ? e.amount * 120 : e.amount), 0);

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Gastos de Hoy</h2>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {showForm ? '✕ Cerrar' : '+ Gasto'}
        </button>
      </div>

      {/* Total */}
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3">
        <p className="text-xs text-red-600 dark:text-red-400 font-medium">Total gastado hoy</p>
        <p className="text-2xl font-bold text-red-700 dark:text-red-300">{totalHoy.toLocaleString()} CUP</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">⚠️ {error}</div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3 animate-slide-up">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">Nuevo Gasto</h3>
          <input
            value={concept} onChange={e => setConcept(e.target.value)}
            placeholder="Concepto (ej: electricidad, transporte)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <input
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="Monto" min="0" step="0.01"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-1">
              <button
                onClick={() => setCurrency('CUP')}
                className={`px-3 py-2 rounded-lg text-xs font-medium ${currency === 'CUP' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
              >CUP</button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3 py-2 rounded-lg text-xs font-medium ${currency === 'USD' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
              >USD</button>
            </div>
          </div>
          <button onClick={saveExpense} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold text-sm transition-colors">
            ✓ Guardar Gasto
          </button>
        </div>
      )}

      {/* Expenses List */}
      <div className="space-y-2">
        {expenses.length === 0 && !showForm && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">💸</p>
            <p className="text-sm">No hay gastos registrados hoy</p>
          </div>
        )}
        {expenses.map(exp => (
          <div key={exp.id} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-800 dark:text-white">{exp.concept}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(exp.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-red-600 dark:text-red-400">
                -{exp.amount.toLocaleString()} {exp.currency}
              </span>
              <button onClick={() => deleteExpense(exp.id)} className="text-red-400 text-xs p-1">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
