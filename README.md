# 🧮 El Cuadre

**Control de finanzas para pequeños negocios en Cuba.**

App web para que tiendas de comida y aseo manejen ventas, gastos, inventario, fiados y cierres de caja.

---

## 🚀 Cómo desplegar (paso a paso)

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta (o inicia sesión).
2. Crea un **Nuevo Proyecto**. Anota la contraseña de la base de datos.
3. Espera a que el proyecto esté listo (~2 minutos).

### 2. Configurar la base de datos

1. En el dashboard de Supabase, ve a **SQL Editor** (menú lateral).
2. Haz clic en **New Query**.
3. Copia y pega TODO el contenido del archivo `schema.sql`.
4. Haz clic en **Run** (o Ctrl+Enter).
5. Verifica que todas las tablas se crearon en **Table Editor**.

### 3. Activar autenticación por email

1. Ve a **Authentication > Providers** en el menú lateral.
2. Asegúrate de que **Email** esté habilitado.
3. Desactiva "Confirm email" si quieres que los usuarios puedan entrar inmediatamente (recomendado para MVP):
   - Ve a **Authentication > Providers > Email**
   - Desmarca "Confirm email"
   - Guarda los cambios

### 4. Obtener las credenciales de la API

1. Ve a **Settings > API** en el menú lateral.
2. Copia:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public key** (una cadena larga que empieza con `eyJ...`)

### 5. Configurar la app

Abre el archivo `src/config.ts` y reemplaza los valores:

```typescript
export const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJ...tu-anon-key-aqui...';
```

O usa variables de entorno creando un archivo `.env` en la raíz:

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...tu-anon-key-aqui...
```

### 6. Desplegar en Cloudflare Pages

**Opción A: Desde Git (recomendado)**

1. Sube tu código a un repositorio de GitHub/GitLab.
2. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com) > **Workers & Pages** > **Create** > **Pages** > **Connect to Git**.
3. Selecciona tu repositorio.
4. Configura el build:
   - **Framework preset**: (ninguno)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Haz clic en **Save and Deploy**.

**Opción B: Upload directo**

1. Ejecuta `npm run build` localmente.
2. Ve a Cloudflare Pages > **Create a project** > **Direct upload**.
3. Sube la carpeta `dist/`.

### 7. ¡Listo!

Abre la URL de tu sitio en Cloudflare Pages. Regístrate con tu email y empieza a usar El Cuadre.

---

## 📱 Funcionalidades

| Pantalla | Descripción |
|----------|-------------|
| **Hoy** | Resumen del día: ventas, gastos, ganancia + alertas de stock bajo |
| **Ventas** | Registrar ventas con productos del inventario, lista del día |
| **Inventario** | Agregar/editar productos con costo, precio y stock |
| **Gastos** | Registrar gastos del día por concepto |
| **Caja** | Cierre diario: monto esperado vs contado, diferencia |
| **Fiados** | Control de deudas: quién debe y a quién se debe |
| **Reportes** | Gráficos de ganancia diaria/semanal/mensual + productos top |
| **Ajustes** | Nombre del negocio, tasa de cambio USD→CUP, modo oscuro |

---

## 🗄️ Estructura de la base de datos

```
settings       → Configuración del negocio (nombre, tasa de cambio)
products       → Inventario (nombre, costo, precio, stock)
sales          → Ventas (total, moneda, items JSONB)
expenses       → Gastos (concepto, monto, moneda)
cash_closures  → Cierres de caja (esperado vs real)
debts          → Fiados (persona, tipo, monto, pagado)
```

Todas las tablas tienen `user_id` y políticas RLS para que cada usuario solo vea sus datos.

---

## 🛠️ Stack técnico

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Deploy**: Cloudflare Pages
- **Monedas**: CUP y USD con tasa de cambio configurable

---

## 📝 Notas

- La tasa de cambio se configura en Ajustes (por defecto 120 CUP/USD).
- Los reportes convierten todo a CUP usando la tasa configurada.
- El stock se descuenta automáticamente al registrar una venta.
- Las alertas de stock bajo aparecen cuando un producto tiene ≤5 unidades.
