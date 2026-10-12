import { useState, useEffect, createContext, useContext } from 'react';
import { supabase, getErrorMessage } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import HoyScreen from './screens/HoyScreen';
import VentasScreen from './screens/VentasScreen';
import InventarioScreen from './screens/InventarioScreen';
import GastosScreen from './screens/GastosScreen';
import CajaScreen from './screens/CajaScreen';
import FiadosScreen from './screens/FiadosScreen';
import ReportesScreen from './screens/ReportesScreen';
import AjustesScreen from './screens/AjustesScreen';

// Context
interface AppContextType {
  session: Session | null;
  darkMode: boolean;
  toggleDarkMode: () => void;
  storeName: string;
  exchangeRate: number;
  refreshSettings: () => void;
}
export const AppContext = createContext<AppContextType>({} as AppContextType);
export const useApp = () => useContext(AppContext);

type Tab = 'hoy' | 'ventas' | 'inventario' | 'gastos' | 'caja' | 'fiados' | 'reportes' | 'ajustes';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'hoy', label: 'Hoy', icon: '📊' },
  { id: 'ventas', label: 'Ventas', icon: '💰' },
  { id: 'inventario', label: 'Inventario', icon: '📦' },
  { id: 'gastos', label: 'Gastos', icon: '💸' },
  { id: 'caja', label: 'Caja', icon: '🏦' },
  { id: 'fiados', label: 'Fiados', icon: '📝' },
  { id: 'reportes', label: 'Reportes', icon: '📈' },
  { id: 'ajustes', label: 'Ajustes', icon: '⚙️' },
];

function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(getErrorMessage(error));
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(getErrorMessage(error));
      else setSuccess('¡Registro exitoso! Revisa tu email para confirmar.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700 p-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🧮</div>
          <h1 className="text-3xl font-bold text-white">El Cuadre</h1>
          <p className="text-blue-200 mt-1">Control de finanzas para tu negocio</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3 text-sm">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg mb-3 text-sm">
              ✅ {success}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="tu@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Cargando...' : isLogin ? 'Entrar' : 'Registrarse'}
          </button>

          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
            className="w-full mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('hoy');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [storeName, setStoreName] = useState('Mi Negocio');
  const [exchangeRate, setExchangeRate] = useState(120);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const refreshSettings = async () => {
    if (!session) return;
    const { data } = await supabase.from('settings').select('*').eq('user_id', session.user.id).single();
    if (data) {
      setStoreName(data.store_name || 'Mi Negocio');
      setExchangeRate(data.exchange_rate || 120);
    }
  };

  useEffect(() => {
    if (session) refreshSettings();
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-bounce">🧮</div>
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  const renderScreen = () => {
    switch (activeTab) {
      case 'hoy': return <HoyScreen />;
      case 'ventas': return <VentasScreen />;
      case 'inventario': return <InventarioScreen />;
      case 'gastos': return <GastosScreen />;
      case 'caja': return <CajaScreen />;
      case 'fiados': return <FiadosScreen />;
      case 'reportes': return <ReportesScreen />;
      case 'ajustes': return <AjustesScreen />;
    }
  };

  return (
    <AppContext.Provider value={{ session, darkMode, toggleDarkMode, storeName, exchangeRate, refreshSettings }}>
      <div className={`h-full flex flex-col ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
        <header className="bg-blue-700 dark:bg-gray-800 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-md">
          <div>
            <h1 className="text-lg font-bold">{storeName}</h1>
            <p className="text-blue-200 dark:text-gray-400 text-xs">El Cuadre</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs bg-blue-600 dark:bg-gray-700 px-3 py-1.5 rounded-lg hover:bg-blue-500 transition-colors"
          >
            Salir
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-20">
          {renderScreen()}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
          <div className="flex overflow-x-auto" style={{scrollbarWidth: 'none'}}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center px-3 py-2 min-w-[64px] text-xs transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <span className="text-lg mb-0.5">{tab.icon}</span>
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </AppContext.Provider>
  );
}
