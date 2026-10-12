import { useState, useEffect } from 'react';
import { supabase, getErrorMessage } from '../lib/supabase';
import { useApp } from '../App';

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
  const { session, userName, userEmail } = useApp();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'por_cobrar' | 'por_pagar'>('all');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'por_cobrar' | 'por_pagar'>('por_cobrar');
  const [currency, setCurrency] = useState<'CUP' | 'USD'>('CUP');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) loadDebts();
  }, [session]);

  const loadDebts = async () => {
    const { data } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', session!.user.id)
      .eq('is_paid', false)
      .order('created_at', { ascending: false });
    if (data) setDebts(data as Debt[]);
    setLoading(false);
  };

  const saveDebt = async () => {
    if (!personName.trim() || !amount) { setError('Nombre y monto son obligatorios'); return; }
    setError('');

    const { error } = await supabase.from('debts').insert({
      user_id: session!.user.id,
      user_name: userName || userEmail,
      person_name: personName.trim(),
      type,
      amount: parseFloat(amount),
      currency,
      is_paid: false,
    });

    if (error) { setError(getErrorMessage(error)); return; }

    setPersonName(''); setAmount(''); setShowForm(false);
    loadDebts();
  };

  const markPaid = async (id: string) => {
    await supabase.from('debts').update({ is_paid: true }).eq('id', id);
    loadDebts();
  };

  const deleteDebt = async (id: string) => {
    if (!confirm('¿Eliminar este fiado?')) return;
    await supabase.from('debts').delete().eq('id', id);
    loadDebts();
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Cargando fiados...</div>;

  const filtered = filter === 'all' ? debts : debts.filter(d => d.type === filter);

  const totalCobrar = debts.filter(d => d.type === 'por_cobrar').reduce((s, d) => s + (d.currency === 'USD' ? d.amount * 120 : d.amount), 0);
  const totalPagar = debts.filter(d => d.type === 'por_pagar').reduce((s, d) => s + (d.currency === 'USD' ? d.amount * 120 : d.amount), 0);

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
          <p className="text-lg font-bold text-green-700 dark:text-green-300">{totalCobrar.toLocaleString()} CUP</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3">
          <p className="text-xs text-red-600 dark:text-red-400">Les debes</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-300">{totalPagar.toLocaleString()} CUP</p>
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

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'por_cobrar', 'por_pagar'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
          >
            {f === 'all' ? 'Todos' : f === 'por_cobrar' ? 'Me deben' : 'Debo'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <p className="text-sm">No hay fiados pendientes</p>
          </div>
        )}
        {filtered.map(d => (
          <div key={d.id} className={`bg-white dark:bg-gray-800 rounded-xl p-3 border ${d.type === 'por_cobrar' ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-800 dark:text-white">{d.person_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {d.type === 'por_cobrar' ? '📥 Me debe' : '📤 Le debo'} · {d.amount.toLocaleString()} {d.currency}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(d.created_at).toLocaleDateString('es-ES')}
                  {d.user_name && <span className="ml-2 text-blue-500">· 👤 {d.user_name}</span>}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => markPaid(d.id)} className="text-green-500 text-xs bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">✓ Pagado</button>
                <button onClick={() => deleteDebt(d.id)} className="text-red-400 text-xs p-1">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
