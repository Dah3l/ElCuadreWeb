import { useState, useEffect } from 'react';
import { supabase, getErrorMessage } from '../lib/supabase';
import { useApp } from '../App';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface SaleItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
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
  const { session, exchangeRate, userName, userEmail } = useApp();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [currency, setCurrency] = useState<'CUP' | 'USD'>('CUP');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) {
      loadSales();
      loadProducts();
    }
  }, [session]);

  const loadSales = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', session!.user.id)
      .gte('created_at', today + 'T00:00:00')
      .order('created_at', { ascending: false });
    if (!error && data) setSales(data as Sale[]);
    setLoading(false);
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, price, stock')
      .eq('user_id', session!.user.id)
      .gt('stock', 0)
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
      setCart([...cart, { product_id: product.id, name: product.name, quantity: 1, price: product.price }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(c => c.product_id !== productId));
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) { removeFromCart(productId); return; }
    setCart(cart.map(c => c.product_id === productId ? { ...c, quantity: qty } : c));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const saveSale = async () => {
    if (cart.length === 0) return;
    setError('');

    const { data, error } = await supabase
      .from('sales')
      .insert({
        user_id: session!.user.id,
        user_name: userName || userEmail,
        total: cartTotal,
        currency,
        items: cart.map(c => ({ product_id: c.product_id, name: c.name, quantity: c.quantity, price: c.price })),
      })
      .select()
      .single();

    if (error) { setError(getErrorMessage(error)); return; }

    // Update stock
    for (const item of cart) {
      await supabase
        .from('products')
        .update({ stock: products.find(p => p.id === item.product_id)!.stock - item.quantity })
        .eq('id', item.product_id);
    }

    setCart([]);
    setShowForm(false);
    loadSales();
    loadProducts();
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Cargando ventas...</div>;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Ventas de Hoy</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {showForm ? '✕ Cerrar' : '+ Nueva'}
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
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                >
                  {p.name} ({p.price})
                </button>
              ))}
              {products.length === 0 && (
                <p className="text-xs text-gray-400">No hay productos. Agrega en Inventario.</p>
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
                    <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded text-xs font-bold">-</button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded text-xs font-bold">+</button>
                    <span className="text-xs text-gray-500 w-16 text-right">{item.price * item.quantity}</span>
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
                  Total: {cartTotal.toLocaleString()} {currency}
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
            <p className="text-sm">No hay ventas hoy</p>
          </div>
        )}
        {sales.map(sale => (
          <div key={sale.id} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">
                  {sale.total.toLocaleString()} {sale.currency}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(sale.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  {sale.user_name && <span className="ml-2 text-blue-500">· 👤 {sale.user_name}</span>}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${sale.currency === 'USD' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                {sale.currency}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(sale.items as SaleItem[]).map((item, i) => (
                <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                  {item.name} x{item.quantity}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
