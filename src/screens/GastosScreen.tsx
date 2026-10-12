import { useState, useEffect } from 'react';
import { supabase, getErrorMessage } from '../lib/supabase';
import { useApp } from '../App';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatMoney, formatTimeDisplay, getTodayISO, toCUP } from '../lib/utils';

interface Expense {
  id: string;
  created_at: string;
  concept: string;
  amount: number;
  currency: string;
  user_name?: string;
}

export default function GastosScreen() {
  const { session, exchangeRate } = useApp();
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'CUP' | 'USD'>('CUP');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterDate, setFilterDate] = useState(getTodayISO());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (session) loadExpenses();
  }, [session, filterDate]);

  const loadExpenses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', session!.user.id)
      .gte('created_at', filterDate + 'T00:00:00')
      .lte('created_at', filterDate + 'T23:59:59')
      .order('created_at', { ascending: false });
    if (!error && data) setExpenses(data as Expense[]);
    setLoading(false);
  };

  const resetForm = () => {
    setConcept(''); setAmount(''); setCurrency('CUP');
    setEditingId(null); setShowForm(false); setError('');
  };

  const startEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setConcept(exp.concept);
    setAmount(String(exp.amount));
    setCurrency(exp.currency as 'CUP' | 'USD');
    setShowForm(true);
  };

  const saveExpense = async () => {
    if (!concept.trim() || !amount) { setError('Concepto y monto son obligatorios'); return; }
    setError('');

    const expenseData = {
      user_id: session!.user.id,
      user_name: '',
      concept: concept.trim(),
      amount: parseFloat(amount),
      currency,
    };

    if (editingId) {
      const { error } = await supabase.from('expenses').update(expenseData).eq('id', editingId);
      if (error) { setError(getErrorMessage(error)); return; }
      showToast('✓ Gasto actualizado', 'success');
    } else {
      const { error } = await supabase.from('expenses').insert(expenseData);
      if (error) { setError(getErrorMessage(error)); return; }
      showToast('✓ Gasto registrado', 'success');
    }

    resetForm();
    loadExpenses();
  };

  const deleteExpense = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('expenses').delete().eq('id', deleteId);
    if (error) {
      showToast('Error al eliminar: ' + getErrorMessage(error), 'error');
    } else {
      showToast('Gasto eliminado', 'info');
      loadExpenses();
    }
    setDeleteId(null);
  };

  const totalCUP = expenses.reduce((sum, e) => sum + toCUP(e.amount, e.currency as 'CUP' | 'USD', exchangeRate), 0);
  const totalUSD = expenses.filter(e => e.currency === 'USD').reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Gastos</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setError(''); }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {showForm ? '✕ Cerrar' : '+ Gasto'}
        </button>
      </div>

      {/* Filtro de fecha */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-600 dark:text-gray-300">Fecha:</label>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
        />
        <button
          onClick={() => setFilterDate(getTodayISO())}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Hoy
        </button>
      </div>

      {/* Total */}
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3">
        <p className="text-xs text-red-600 dark:text-red-400 font-medium">Total gastado</p>
        <p className="text-xl font-bold text-red-700 dark:text-red-300">{formatMoney(totalCUP, 'CUP')}</p>
        {totalUSD > 0 && (
          <p className="text-xs text-red-500 dark:text-red-400">({formatMoney(totalUSD, 'USD')} en USD)</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">⚠️ {error}</div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3 animate-slide-up">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">
            {editingId ? 'Editar Gasto' : 'Nuevo Gasto'}
          </h3>
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
            ✓ {editingId ? 'Actualizar' : 'Guardar'} Gasto
          </button>
        </div>
      )}

      {/* Expenses List */}
      <div className="space-y-2">
        {expenses.length === 0 && !showForm && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">💸</p>
            <p className="text-sm">No hay gastos en esta fecha</p>
          </div>
        )}
        {expenses.map(exp => (
          <div key={exp.id} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="flex-1">
              <p className="font-medium text-gray-800 dark:text-white">{exp.concept}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatTimeDisplay(exp.created_at)}
                {exp.user_name && <span className="ml-2 text-blue-500">· 👤 {exp.user_name}</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-red-600 dark:text-red-400">
                -{formatMoney(exp.amount, exp.currency as 'CUP' | 'USD')}
              </span>
              <button onClick={() => startEdit(exp)} className="text-blue-500 text-xs p-1 hover:text-blue-700">✏️</button>
              <button onClick={() => setDeleteId(exp.id)} className="text-red-400 text-xs p-1 hover:text-red-600">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar gasto"
        message="¿Estás seguro de eliminar este gasto?"
        confirmLabel="Eliminar"
        danger
        onConfirm={deleteExpense}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
