const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(err.message ?? `Error ${res.status}`);
  }
  return res.json();
}

export const api = {
  mesas: {
    list: () => apiFetch<import('./types').Mesa[]>('/tables'),
    abrir: (mesaId: string) =>
      apiFetch<{ id: string }>(`/tables/${mesaId}/open`, { method: 'POST' }),
    visitaActiva: (mesaId: string) =>
      apiFetch<{ id: string }>(`/tables/${mesaId}/active-visit`),
    actualizarLayout: (
      posiciones: Array<{ id: string; filaPosicion: number | null; colPosicion: number | null }>,
    ) =>
      apiFetch<{ ok: boolean; actualizadas: number }>('/tables/layout', {
        method: 'POST',
        body: JSON.stringify({ posiciones }),
      }),
  },
  menu: {
    list: () => apiFetch<import('./types').PlatoCarta[]>('/menu'),
    toggleDisponible: (platoId: string, disponible: boolean) =>
      apiFetch(`/platos/${platoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ disponible }),
      }),
  },
  visitas: {
    get: (visitaId: string) => apiFetch<import('./types').Visita>(`/visits/${visitaId}`),
    crearPedido: (
      visitaId: string,
      items: Array<{ platoCartaId: string; cantidad: number; notas?: string }>,
      opciones: { paraLlevar?: boolean; nombreClienteLlevar?: string } = {},
    ) =>
      apiFetch<import('./types').Pedido>(`/visits/${visitaId}/orders`, {
        method: 'POST',
        body: JSON.stringify({ items, ...opciones }),
      }),
    cerrar: (visitaId: string) =>
      apiFetch(`/visits/${visitaId}/close`, { method: 'POST' }),
    imprimirCuenta: (visitaId: string) =>
      apiFetch<{ ok: boolean }>(`/visits/${visitaId}/print-bill`, { method: 'POST' }),
    pagarMesero: (visitaId: string, pagos: Array<{ metodoPago: string; monto: number }>) =>
      apiFetch<{ ok: boolean }>(`/visits/${visitaId}/pay-waiter`, {
        method: 'POST',
        body: JSON.stringify({ pagos }),
      }),
    abrirParaLlevar: (data?: { nombreCliente?: string }) =>
      apiFetch<{ id: string }>('/visits/llevar', {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      }),
  },
  pedidos: {
    cambiarEstado: (pedidoId: string, estado: string, opciones: { motivoCancelacion?: string } = {}) =>
      apiFetch<import('./types').Pedido>(`/orders/${pedidoId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ estado, ...opciones }),
      }),
  },
  monitor: {
    get: () => apiFetch<MonitorItem[]>('/monitor'),
  },
  ticketeras: {
    list:      () => apiFetch<PrinterInfo[]>('/admin/ticketeras'),
    testPrint: (tipo: 'cocina' | 'recibos') =>
      apiFetch<{ ok: boolean }>(`/admin/ticketeras/${tipo}/test`, { method: 'POST' }),
  },
  admin: {
    turnosHoy:          () => apiFetch<TurnoResumen[]>('/cash/shifts'),
    listUsuarios:       () => apiFetch<UsuarioAdmin[]>('/admin/users'),
    crearUsuario:       (data: { name: string; email: string; password: string; role: string }) =>
      apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
    updateUsuario:      (id: string, data: { activo?: boolean; role?: string }) =>
      apiFetch(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    crearMesa:          (numero: number, capacidad: number) =>
      apiFetch('/tables', { method: 'POST', body: JSON.stringify({ numero, capacidad }) }),
    eliminarMesa:       (id: string) =>
      apiFetch(`/tables/${id}`, { method: 'DELETE' }),
    crearPlato:         (data: { nombre: string; precio: string; categoria: string }) =>
      apiFetch('/platos', { method: 'POST', body: JSON.stringify(data) }),
    crearPlatosBulk:    (data: {
      categoria: string;
      platos: Array<{ nombre: string; precio: string; descripcion?: string }>;
    }) =>
      apiFetch<import('./types').PlatoCarta[]>('/platos/bulk', { method: 'POST', body: JSON.stringify(data) }),
    editarPlato:        (id: string, data: { nombre: string; precio: string; categoria: string }) =>
      apiFetch<import('./types').PlatoCarta>(`/platos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    toggleActivoPlato:  (id: string, activo: boolean) =>
      apiFetch(`/platos/${id}`, { method: 'PATCH', body: JSON.stringify({ activo }) }),
    getStock:           () => apiFetch<InsumoStock[]>('/admin/stock'),
    ajustarStock:       (insumoId: string, cantidad: number, notas?: string) =>
      apiFetch<{ stockActual: number }>('/admin/stock/ajuste', {
        method: 'POST',
        body: JSON.stringify({ insumoId, cantidad, notas }),
      }),
    syncDisponible:     () => apiFetch<{ sincronizados: number; conStock: number; sinStock: number }>('/admin/stock/sync', { method: 'POST' }),
    promociones: {
      list:      () => apiFetch<import('./types').Promocion[]>('/admin/promociones'),
      get:       (id: string) => apiFetch<import('./types').Promocion>(`/admin/promociones/${id}`),
      create:    (data: import('./types').UpsertPromocion) =>
        apiFetch<import('./types').Promocion>('/admin/promociones', { method: 'POST', body: JSON.stringify(data) }),
      update:    (id: string, data: import('./types').UpsertPromocion) =>
        apiFetch<import('./types').Promocion>(`/admin/promociones/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      setActivo: (id: string, activo: boolean) =>
        apiFetch(`/admin/promociones/${id}/activo`, { method: 'PATCH', body: JSON.stringify({ activo }) }),
      remove:    (id: string) =>
        apiFetch(`/admin/promociones/${id}`, { method: 'DELETE' }),
    },
  },
  caja: {
    turnoActual: () => apiFetch<TurnoCaja | null>('/cash/shift/current'),
    abrirTurno: (montoApertura: number) =>
      apiFetch<TurnoCaja>('/cash/shift/open', { method: 'POST', body: JSON.stringify({ montoApertura }) }),
    cerrarTurno: (montoCierreReal: number) =>
      apiFetch<TurnoCaja>('/cash/shift/close', { method: 'POST', body: JSON.stringify({ montoCierreReal }) }),
    visitasParaCobrar: () => apiFetch<VisitaResumen[]>('/cash/visits-to-collect'),
    detalleVisita: (visitaId: string) => apiFetch<DetalleVisitaCaja>(`/cash/visits/${visitaId}`),
    registrarPago: (
      visitaId: string,
      pagos: Array<{ metodoPago: string; monto: number }>,
      ajuste?: { monto: number; motivo: string },
    ) =>
      apiFetch(`/cash/visits/${visitaId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ pagos, ...(ajuste ? { ajuste } : {}) }),
      }),
    imprimirPrecuenta: (visitaId: string) =>
      apiFetch<{ ok: boolean; total: string }>(`/cash/visits/${visitaId}/print-precuenta`, {
        method: 'POST',
      }),
    crearPedidoLlevar: (data: {
      nombreCliente: string;
      items: Array<{ platoCartaId: string; cantidad: number; notas?: string }>;
    }) =>
      apiFetch<{ ok: boolean; visitaId: string }>('/cash/pedidos/llevar', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    crearPedidoDelivery: (data: {
      nombreCliente: string;
      telefonoCliente?: string;
      direccionDelivery: string;
      costoEnvio: number;
      items: Array<{ platoCartaId: string; cantidad: number; notas?: string }>;
    }) =>
      apiFetch<{ ok: boolean; visitaId: string }>('/cash/pedidos/delivery', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};

export interface TurnoCaja {
  id: string;
  estado: 'abierto' | 'cerrado';
  montoApertura: string;
  montoCierreTeorico?: string;
  montoCierreReal?: string;
  diferencia?: string;
  fechaApertura: string;
  fechaCierre?: string;
  totalEfectivo?: string;
  totalTurno?: string;
  porCanal?: { efectivo: string; tarjeta: string; yape_plin: string; transferencia: string };
  pagos?: PagoCaja[];
}

export interface PagoCaja {
  id: string;
  visitaMesaId: string;
  metodoPago: string;
  montoTotal: string;
  fechaPago: string;
  mesaNumero?: number | null;
}

export interface VisitaResumen {
  visitaId: string;
  mesaNumero: number | null;
  tipo: 'mesa' | 'llevar' | 'delivery';
  nombreCliente?: string | null;
  telefonoCliente?: string | null;
  direccionDelivery?: string | null;
  costoEnvio?: string | null;
  paraLlevar?: boolean;
  fechaApertura: string;
  total: string;
  pedidos: number;
}

export interface DetalleVisitaCaja {
  visitaId: string;
  mesaNumero: number | null;
  tipo: 'mesa' | 'llevar' | 'delivery';
  nombreCliente?: string | null;
  telefonoCliente?: string | null;
  direccionDelivery?: string | null;
  costoEnvio?: string | null;
  fechaApertura: string;
  resumen: Array<{ nombre: string; cantidad: number; precioUnitario: string; descuentoUnitario?: string }>;
  total: string;
  descuentoTotal?: string;
}

export interface UsuarioAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
  activo: boolean | null;
  createdAt: string;
}

export interface TurnoResumen {
  id: string;
  cajeroNombre: string;
  estado: 'abierto' | 'cerrado';
  montoApertura: string;
  montoCierreTeorico?: string;
  montoCierreReal?: string;
  diferencia?: string;
  fechaApertura: string;
  fechaCierre?: string;
  porCanal: { efectivo: string; tarjeta: string; yape_plin: string; transferencia: string };
  totalTurno: string;
  cobros: number;
}

export interface MonitorItem {
  pedidoId: string;
  visitaId: string;
  mesaNumero: number;
  estado: string;
  fechaCreacion: string;
  minutosEspera: number;
  items: Array<{ platoCartaId: string; cantidad: number; notas: string | null }>;
}

export interface PrinterInfo {
  tipo: 'cocina' | 'recibos';
  label: string;
  ip: string;
  port: number;
  online: boolean;
  latencyMs?: number;
}

export interface InsumoStock {
  id: string;
  nombre: string;
  stockActual: number;
  nombreUnidadMinima: string;
  unidadesPorUnidadDeCompra: number;
  activo: boolean;
  platosAsociados: Array<{
    id: string;
    nombre: string;
    disponible: boolean;
    cantidadConsumida: number;
  }>;
}
