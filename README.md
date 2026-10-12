# 🧮 El Cuadre

**Control de finanzas para pequeños negocios en Cuba.**

App web para que tiendas de comida y aseo manejen ventas, gastos, inventario, fiados y cierres de caja con trazabilidad completa de usuarios.

---

## 🚀 Cómo desplegar (paso a paso)

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta (o inicia sesión).
2. Crea un **Nuevo Proyecto**. Anota la contraseña de la base de datos.
3. Espera a que el proyecto esté listo (~2 minutos).

### 2. Configurar la base de datos

**Si es instalación nueva:**

1. En el dashboard de Supabase, ve a **SQL Editor** (menú lateral).
2. Haz clic en **New Query**.
3. Copia y pega TODO el contenido del archivo `schema.sql`.
4. Haz clic en **Run** (o Ctrl+Enter).

**Si ya tienes tablas creadas (migración):**

1. Ve a **SQL Editor** > **New Query**.
2. Copia y pega el contenido de `migration.sql`.
3. Haz clic en **Run**.

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
| **Hoy** | Resumen del día: ventas, gastos, costo productos, ganancia neta + desglose detallado + alertas de stock bajo |
| **Ventas** | Registrar/editar/eliminar ventas, historial con filtro por fecha, carrito con productos |
| **Gastos** | Registrar/editar/eliminar gastos, historial con filtro por fecha |
| **Inventario** | Agregar/editar/eliminar productos con costo, precio y stock |
| **Caja** | Cierre diario con apertura, desglose por moneda (CUP/USD), historial |
| **Fiados** | Control de deudas pendientes y pagadas, filtros por tipo y estado |
| **Reportes** | Gráficos de ganancia neta, productos top, exportar CSV y PDF |
| **Ajustes** | Tu nombre, nombre del negocio, tasa de cambio USD→CUP, modo oscuro |

---

## 👤 Trazabilidad de Usuarios

Cada operación queda documentada con el nombre del usuario que la realizó:

- **Header**: Muestra el nombre del usuario conectado en todo momento
- **Ventas**: Cada venta muestra quién la registró
- **Gastos**: Cada gasto muestra quién lo registró
- **Cierres de caja**: Cada cierre muestra quién lo hizo
- **Fiados**: Cada registro de deuda muestra quién lo creó

El nombre se configura en **Ajustes** y se guarda junto a cada operación para auditoría y control de responsabilidades.

---

## 💰 Cálculo de Ganancia Neta

La ganancia neta se calcula como:

```
Ganancia Neta = Ventas Brutas − Costo de Productos Vendidos − Gastos
```

Esto significa que:
- Se descuenta el **costo real** de los productos vendidos (no solo el precio de venta)
- Los gastos operativos también se descuentan
- El resultado es la **ganancia real** del negocio

---

## 🏦 Cierre de Caja Avanzado

El cierre de caja incluye:

1. **Fondo inicial / Apertura**: Monto con el que se empieza el día
2. **Desglose por moneda**:
   - Ventas en CUP y USD
   - Gastos en CUP y USD
3. **Monto esperado**: Apertura + Ventas − Gastos (todo en CUP)
4. **Monto contado**: Desglose en CUP y USD
5. **Diferencia**: Contado − Esperado

---

## 📊 Exportación de Datos

### CSV
- Exporta todas las ventas y gastos del período seleccionado
- Compatible con Excel, Google Sheets, etc.

### PDF
- Reporte profesional con resumen financiero
- Tabla de productos más vendidos
- Fecha de generación automática

---

## 🗄️ Estructura de Base de Datos

```
settings       → Configuración del negocio (nombre, tasa de cambio, nombre usuario)
products       → Inventario (nombre, costo, precio, stock)
sales          → Ventas (total, moneda, items JSONB con costo incluido)
expenses       → Gastos (concepto, monto, moneda)
cash_closures  → Cierres de caja (apertura, desglose por moneda, esperado vs real)
debts          → Fiados (persona, tipo, monto, pagado)
```

Todas las tablas tienen `user_id` y políticas RLS para que cada usuario solo vea sus datos.

---

## 🛠️ Stack técnico

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **PDF**: jsPDF + jspdf-autotable
- **Deploy**: Cloudflare Pages
- **Monedas**: CUP y USD con tasa de cambio configurable

---

## 📝 Notas

- La tasa de cambio se configura en Ajustes (por defecto 120 CUP/USD).
- Los reportes convierten todo a CUP usando la tasa configurada.
- El stock se descuenta automáticamente al registrar una venta.
- Las alertas de stock bajo aparecen cuando un producto tiene ≤5 unidades.
- La ganancia neta descuenta el costo de los productos vendidos.
- Las ventas y gastos pueden editarse y eliminarse (con confirmación).
- El historial permite ver días anteriores con filtro de fecha.

---

## 🆕 Novedades v1.1

- ✅ Trazabilidad completa de usuarios en todas las operaciones
- ✅ Ganancia neta calculada con costo de productos vendidos
- ✅ Cierre de caja con apertura y desglose por moneda
- ✅ Editar y eliminar ventas, gastos, productos y fiados
- ✅ Historial con filtro por fecha en ventas y gastos
- ✅ Historial de fiados pagados
- ✅ Exportar reportes a CSV y PDF
- ✅ Desglose detallado de cálculos en Caja y Reportes
- ✅ Toasts de confirmación en todas las acciones
- ✅ Formato de moneda unificado en toda la app
- ✅ Confirmación antes de eliminar cualquier registro
- ✅ Fix: Race condition de tasa de cambio al recargar
- ✅ Fix: Contraste en modo oscuro
- ✅ Fix: Max-width consistente en escritorio
