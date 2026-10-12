import { useState, useEffect } from 'react';
import { supabase, getErrorMessage } from '../lib/supabase';
import { useApp } from '../App';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatMoney, toCUP } from '../lib/utils';

interface Debt {
  id: string;
  person_name: string;
  type: 'por_cobrar' | 'por_pagar';
  amount: number;
  currency: string;
  is_paid: boolean;
  created_at: string;
  user_name?: string;
}

export default function FiadosScreen() {
  const { session, exchangeRate } = useApp();
  const { showToast } = useToast();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'paid' | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState<'all' | 'por_cobrar' | 'por_pagar'>('all');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'por_cobrar' | 'por_pagar'>('por_cobrar');
  const [currency, setCurrency] = useState<'CUP' | 'USD'>('CUP');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (session) loadDebts();
  }, [session]);

  const loadDebts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', session!.user.id)
      .order('created_at', { ascending: false });
    if (data) setDebts(data as Debt[]);
    setLoading(false);
  };

  const saveDebt = async () => {
    if (!personName.trim() || !amount) { setError('Nombre y monto son obligatorios'); return; }
    setError('');

    const { error } = await supabase.from('debts').insert({
      user_id: session!.user.id,
      user_name: '',
      person_name: personName.trim(),
      type,
      amount: parseFloat(amount),
      currency,
      is_paid: false,
    });

    if (error) { setError(getErrorMessage(error)); return; }

    setPersonName(''); setAmount(''); setShowForm(false);
    showToast('✓ Fiado registrado', 'success');
    loadDebts();
  };

  const markPaid = async (id: string) => {
    await supabase.from('debts').update({ is_paid: true }).eq('id', id);
    showToast('✓ Marcado como pagado', 'success');
    loadDebts();
  };

  const markUnpaid = async (id: string) => {
    await supabase.from('debts').update({ is_paid: false }).eq('id', id);
    showToast('Marcado como pendiente', 'info');
    loadDebts();
  };

  const deleteDebt = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('debts').delete().eq('id', deleteId);
    if (error) {
      showToast('Error al eliminar: ' + getErrorMessage(error), 'error');
    } else {
      showToast('Fiado eliminado', 'info');
      loadDebts();
    }
    setDeleteId(null);
  };

  if (loading) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Cargando fiados...</div>;

  // Filtrar por estado (pendiente/pagado/todos)
  const byStatus = filter === 'all' ? debts : debts.filter(d => filter === 'pending' ? !d.is_paid : d.is_paid);
  // Filtrar por tipo
  const filtered = typeFilter === 'all' ? byStatus : byStatus.filter(d => d.type === typeFilter);

  const pending = debts.filter(d => !d.is_paid);
  const totalCobrar = pending.filter(d => d.type === 'por_cobrar').reduce((s, d) => s + toCUP(d.amount, d.currency as 'CUP' | 'USD', exchangeRate), 0);
  const totalPagar = pending.filter(d => d.type === 'por_pagar').reduce((s, d) => s + toCUP(d.amount, d.currency as 'CUP' | 'USD', exchangeRate), 0);

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Fiados</h2>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {showForm ? '✕ Cerrar' : '+ Fiado'}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-3">
          <p className="text-xs text-green-600 dark:text-green-400">Le deben a ti</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatMoney(totalCobrar, 'CUP')}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3">
          <p className="text-xs text-red-600 dark:text-red-400">Les debes</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-300">{formatMoney(totalPagar, 'CUP')}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">⚠️ {error}</div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3 animate-slide-up">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">Nuevo Fiado</h3>
          <input
            value={personName} onChange={e => setPersonName(e.target.value)}
            placeholder="Nombre de la persona"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <input
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="Monto" min="0" step="0.01"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-1">
              <button onClick={() => setCurrency('CUP')} className={`px-3 py-2 rounded-lg text-xs font-medium ${currency === 'CUP' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>CUP</button>
              <button onClick={() => setCurrency('USD')} className={`px-3 py-2 rounded-lg text-xs font-medium ${currency === 'USD' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>USD</button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setType('por_cobrar')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'por_cobrar' ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
            >
              Me deben
            </button>
            <button
              onClick={() => setType('por_pagar')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'por_pagar' ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
            >
              Debo
            </button>
          </div>
          <button onClick={saveDebt} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-semibold text-sm transition-colors">
            ✓ Guardar
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {([['pending', 'Pendientes'], ['paid', 'Pagados'], ['all', 'Todos']] as const).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {([['all', 'Todos'], ['por_cobrar', 'Me deben'], ['por_pagar', 'Debo']] as const).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium ${typeFilter === f ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <p className="text-sm">No hay registros</p>
          </div>
        )}
        {filtered.map(d => (
          <div key={d.id} className={`bg-white dark:bg-gray-800 rounded-xl p-3 border ${d.is_paid ? 'border-gray-300 dark:border-gray-600 opacity-60' : d.type === 'por_cobrar' ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800 dark:text-white">{d.person_name}</p>
                  {d.is_paid && <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">Pagado</span>}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {d.type === 'por_cobrar' ? '📥 Me debe' : '📤 Le debo'} · {formatMoney(d.amount, d.currency as 'CUP' | 'USD')}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(d.created_at).toLocaleDateString('es-ES')}
                  {d.user_name && <span className="ml-2 text-blue-500">· 👤 {d.user_name}</span>}
                </p>
              </div>
              <div className="flex gap-1">
                {!d.is_paid ? (
                  <button onClick={() => markPaid(d.id)} className="text-green-500 text-xs bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded hover:bg-green-100">✓ Pagado</button>
                ) : (
                  <button onClick={() => markUnpaid(d.id)} className="text-blue-500 text-xs bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded hover:bg-blue-100">↺ Revertir</button>
                )}
                <button onClick={() => setDeleteId(d.id)} className="text-red-400 text-xs p-1 hover:text-red-600">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar fiado"
        message="¿Estás seguro de eliminar este registro de fiado?"
        confirmLabel="Eliminar"
        danger
        onConfirm={deleteDebt}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
