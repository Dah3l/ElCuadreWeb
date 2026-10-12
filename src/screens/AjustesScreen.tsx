import { useState, useEffect } from 'react';
import { supabase, getErrorMessage } from '../lib/supabase';
import { useApp } from '../App';
import { useToast } from '../components/Toast';

export default function AjustesScreen() {
  const { session, darkMode, toggleDarkMode, refreshSettings, userEmail } = useApp();
  const { showToast } = useToast();
  const [storeName, setStoreName] = useState('');
  const [userName, setUserName] = useState('');
  const [exchangeRate, setExchangeRate] = useState('120');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) loadSettings();
  }, [session]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', session!.user.id)
      .single();

    if (data) {
      setStoreName(data.store_name || '');
      setUserName(data.user_name || '');
      setExchangeRate(String(data.exchange_rate || 120));
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    setError('');

    const rate = parseFloat(exchangeRate);
    if (isNaN(rate) || rate <= 0) {
      setError('La tasa de cambio debe ser un número mayor a 0');
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('settings')
      .upsert({
        user_id: session!.user.id,
        store_name: storeName.trim() || 'Mi Negocio',
        user_name: userName.trim(),
        exchange_rate: rate,
      }, { onConflict: 'user_id' });

    if (error) {
      setError(getErrorMessage(error));
    } else {
      showToast('✓ Ajustes guardados', 'success');
      refreshSettings();
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Cargando ajustes...</div>;

  return (
    <div className="animate-fade-in space-y-4">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white">Ajustes</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">⚠️ {error}</div>
      )}

      {/* User Name */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">👤 Tu Nombre</h3>
        <input
          value={userName}
          onChange={e => setUserName(e.target.value)}
          placeholder="Ej: Fulano Pérez"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400">
          Se mostrará en cada operación que registres (ventas, gastos, cierres, etc.)
        </p>
        <p className="text-xs text-blue-500">
          📧 Email: {userEmail}
        </p>
      </div>

      {/* Store Name */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">🏪 Nombre del Negocio</h3>
        <input
          value={storeName}
          onChange={e => setStoreName(e.target.value)}
          placeholder="Ej: Bodega La Esquina"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Exchange Rate */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">💱 Tasa de Cambio (USD → CUP)</h3>
        <input
          type="number"
          value={exchangeRate}
          onChange={e => setExchangeRate(e.target.value)}
          placeholder="120"
          min="0"
          step="0.01"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400">
          Se usa para convertir ventas y gastos en USD a CUP en los reportes.
        </p>
      </div>

      {/* Dark Mode */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">🌙 Modo Oscuro</h3>
            <p className="text-xs text-gray-400">Reduce el brillo de la pantalla</p>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={saveSettings}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
      >
        {saving ? 'Guardando...' : '💾 Guardar Ajustes'}
      </button>

      {/* App Info */}
      <div className="text-center pt-4 space-y-1">
        <p className="text-xs text-gray-400">El Cuadre v1.1</p>
        <p className="text-xs text-gray-400">Control de finanzas para pequeños negocios</p>
        <p className="text-xs text-gray-400">Hecho con ❤️ para Cuba</p>
      </div>
    </div>
  );
}
