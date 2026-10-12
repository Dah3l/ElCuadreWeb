import { useState, useEffect } from 'react';
import { supabase, getErrorMessage } from '../lib/supabase';
import { useApp } from '../App';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatMoney, formatTimeDisplay, getTodayISO } from '../lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
}

interface SaleItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  cost: number;
}

interface Sale {
  id: string;
  created_at: string;
  total: number;
  currency: string;
  items: SaleItem[];
  user_name?: string;
}

export default function VentasScreen() {
  const { session } = useApp();
  const { showToast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [currency, setCurrency] = useState<'CUP' | 'USD'>('CUP');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterDate, setFilterDate] = useState(getTodayISO());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      loadSales();
      loadProducts();
    }
  }, [session, filterDate]);

  const loadSales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', session!.user.id)
      .gte('created_at', filterDate + 'T00:00:00')
      .lte('created_at', filterDate + 'T23:59:59')
      .order('created_at', { ascending: false });
    if (!error && data) setSales(data as Sale[]);
    setLoading(false);
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, price, cost, stock')
      .eq('user_id', session!.user.id)
      .order('name');
    if (data) setProducts(data as Product[]);
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(c => c.product_id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        setError('No hay más stock disponible');
        setTimeout(() => setError(''), 2000);
        return;
      }
      setCart(cart.map(c => c.product_id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      if (product.stock <= 0) {
        setError('Producto sin stock');
        setTimeout(() => setError(''), 2000);
        return;
      }
      setCart([...cart, { product_id: product.id, name: product.name, quantity: 1, price: product.price, cost: product.cost || 0 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(c => c.product_id !== productId));
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) { removeFromCart(productId); return; }
    const product = products.find(p => p.id === productId);
    if (product && qty > product.stock) {
      setError('No hay más stock disponible');
      setTimeout(() => setError(''), 2000);
      return;
    }
    setCart(cart.map(c => c.product_id === productId ? { ...c, quantity: qty } : c));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const saveSale = async () => {
    if (cart.length === 0) return;
    setError('');

    const { error } = await supabase
      .from('sales')
      .insert({
        user_id: session!.user.id,
        user_name: '', // Se llena desde el contexto
        total: cartTotal,
        currency,
        items: cart.map(c => ({
          product_id: c.product_id,
          name: c.name,
          quantity: c.quantity,
          price: c.price,
          cost: c.cost,
        })),
      });

    if (error) { setError(getErrorMessage(error)); return; }

    // Update stock
    for (const item of cart) {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        await supabase
          .from('products')
          .update({ stock: product.stock - item.quantity })
          .eq('id', item.product_id);
      }
    }

    setCart([]);
    setShowForm(false);
    showToast('✓ Venta guardada', 'success');
    loadSales();
    loadProducts();
  };

  const deleteSale = async () => {
    if (!deleteId) return;
    const sale = sales.find(s => s.id === deleteId);
    if (!sale) return;

    // Restaurar stock
    const items = sale.items;
    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single();
      if (product) {
        await supabase
          .from('products')
          .update({ stock: product.stock + item.quantity })
          .eq('id', item.product_id);
      }
    }

    const { error } = await supabase.from('sales').delete().eq('id', deleteId);
    if (error) {
      showToast('Error al eliminar: ' + getErrorMessage(error), 'error');
    } else {
      showToast('Venta eliminada', 'info');
      loadSales();
      loadProducts();
    }
    setDeleteId(null);
  };

  const totalDelDia = sales.reduce((sum, s) => sum + (s.currency === 'USD' ? s.total : s.total), 0);

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Ventas</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {showForm ? '✕ Cerrar' : '+ Nueva'}
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* New Sale Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3 animate-slide-up">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">Nueva Venta</h3>

          {/* Products */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Toca un producto para agregar:</p>
            <div className="flex flex-wrap gap-2">
              {products.filter(p => p.stock > 0).map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                >
                  {p.name} ({formatMoney(p.price, 'CUP')})
                </button>
              ))}
              {products.filter(p => p.stock > 0).length === 0 && (
                <p className="text-xs text-gray-400">No hay productos con stock. Agrega en Inventario.</p>
              )}
            </div>
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Carrito:</p>
              {cart.map(item => (
                <div key={item.product_id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-700 dark:text-gray-200">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded text-xs font-bold text-gray-700 dark:text-gray-200">-</button>
                    <span className="text-sm font-medium w-6 text-center text-gray-700 dark:text-gray-200">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded text-xs font-bold text-gray-700 dark:text-gray-200">+</button>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right">{formatMoney(item.price * item.quantity, currency)}</span>
                    <button onClick={() => removeFromCart(item.product_id)} className="text-red-500 text-xs ml-1">✕</button>
                  </div>
                </div>
              ))}

              {/* Currency */}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">Moneda:</span>
                <button
                  onClick={() => setCurrency('CUP')}
                  className={`px-3 py-1 rounded text-xs font-medium ${currency === 'CUP' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
                >CUP</button>
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 rounded text-xs font-medium ${currency === 'USD' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
                >USD</button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                <span className="font-bold text-gray-800 dark:text-white">
                  Total: {formatMoney(cartTotal, currency)}
                </span>
                <button
                  onClick={saveSale}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  ✓ Guardar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sales List */}
      <div className="space-y-2">
        {sales.length === 0 && !showForm && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">No hay ventas en esta fecha</p>
          </div>
        )}
        {sales.map(sale => (
          <div key={sale.id} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-semibold text-gray-800 dark:text-white">
                  {formatMoney(sale.total, sale.currency as 'CUP' | 'USD')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTimeDisplay(sale.created_at)}
                  {sale.user_name && <span className="ml-2 text-blue-500">· 👤 {sale.user_name}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${sale.currency === 'USD' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                  {sale.currency}
                </span>
                <button
                  onClick={() => setDeleteId(sale.id)}
                  className="text-red-400 text-xs p-1 hover:text-red-600"
                  title="Eliminar venta"
                >
                  🗑️
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {sale.items.map((item, i) => (
                <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                  {item.name} x{item.quantity}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar venta"
        message="¿Estás seguro de eliminar esta venta? Se restaurará el stock de los productos."
        confirmLabel="Eliminar"
        danger
        onConfirm={deleteSale}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
