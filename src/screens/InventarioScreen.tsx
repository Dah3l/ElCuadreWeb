import { useState, useEffect } from 'react';
import { supabase, getErrorMessage } from '../lib/supabase';
import { useApp } from '../App';

interface Product {
  id: string;
  name: string;
  cost: number;
  price: number;
  stock: number;
}

export default function InventarioScreen() {
  const { session } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) loadProducts();
  }, [session]);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', session!.user.id)
      .order('name');
    if (!error && data) setProducts(data as Product[]);
    setLoading(false);
  };

  const resetForm = () => {
    setName(''); setCost(''); setPrice(''); setStock('');
    setEditingId(null); setShowForm(false); setError('');
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setName(p.name); setCost(String(p.cost)); setPrice(String(p.price)); setStock(String(p.stock));
    setShowForm(true);
  };

  const saveProduct = async () => {
    if (!name.trim() || !price) { setError('Nombre y precio son obligatorios'); return; }
    setError('');

    const productData = {
      user_id: session!.user.id,
      name: name.trim(),
      cost: parseFloat(cost) || 0,
      price: parseFloat(price) || 0,
      stock: parseInt(stock) || 0,
    };

    if (editingId) {
      const { error } = await supabase.from('products').update(productData).eq('id', editingId);
      if (error) { setError(getErrorMessage(error)); return; }
    } else {
      const { error } = await supabase.from('products').insert(productData);
      if (error) { setError(getErrorMessage(error)); return; }
    }

    resetForm();
    loadProducts();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    await supabase.from('products').delete().eq('id', id);
    loadProducts();
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Cargando inventario...</div>;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Inventario</h2>
        <button
          onClick={() => showForm ? resetForm() : setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {showForm ? '✕ Cerrar' : '+ Producto'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">⚠️ {error}</div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3 animate-slide-up">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">
            {editingId ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="Nombre del producto"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number" value={cost} onChange={e => setCost(e.target.value)}
              placeholder="Costo" min="0" step="0.01"
              className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number" value={price} onChange={e => setPrice(e.target.value)}
              placeholder="Precio" min="0" step="0.01"
              className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number" value={stock} onChange={e => setStock(e.target.value)}
              placeholder="Stock" min="0"
              className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button onClick={saveProduct} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold text-sm transition-colors">
            ✓ {editingId ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      )}

      {/* Products List */}
      <div className="space-y-2">
        {products.length === 0 && !showForm && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm">No hay productos. Agrega el primero.</p>
          </div>
        )}
        {products.map(p => (
          <div key={p.id} className={`bg-white dark:bg-gray-800 rounded-xl p-3 border ${p.stock <= 5 ? 'border-yellow-300 dark:border-yellow-700' : 'border-gray-200 dark:border-gray-700'}`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800 dark:text-white">{p.name}</p>
                  {p.stock <= 5 && <span className="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded">⚠️ Bajo</span>}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Costo: {p.cost} · Precio: {p.price} · Stock: {p.stock}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(p)} className="text-blue-500 p-1 text-sm">✏️</button>
                <button onClick={() => deleteProduct(p.id)} className="text-red-500 p-1 text-sm">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
