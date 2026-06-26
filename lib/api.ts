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
    ) =>
      apiFetch<import('./types').Pedido>(`/visits/${visitaId}/orders`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
    cerrar: (visitaId: string) =>
      apiFetch(`/visits/${visitaId}/close`, { method: 'POST' }),
  },
  pedidos: {
    cambiarEstado: (pedidoId: string, estado: string) =>
      apiFetch<import('./types').Pedido>(`/orders/${pedidoId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ estado }),
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
    crearPlato:         (data: { nombre: string; precio: string; categoriaInventario: string; tipoPlato?: string }) =>
      apiFetch('/platos', { method: 'POST', body: JSON.stringify(data) }),
    editarPlato:        (id: string, data: { nombre: string; precio: string; categoriaInventario: string; tipoPlato?: string | null }) =>
      apiFetch(`/platos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    toggleActivoPlato:  (id: string, activo: boolean) =>
      apiFetch(`/platos/${id}`, { method: 'PATCH', body: JSON.stringify({ activo }) }),
    getStock:           () => apiFetch<InsumoStock[]>('/admin/stock'),
    ajustarStock:       (insumoId: string, cantidad: number, notas?: string) =>
      apiFetch<{ stockActual: number }>('/admin/stock/ajuste', {
        method: 'POST',
        body: JSON.stringify({ insumoId, cantidad, notas }),
      }),
    syncDisponible:     () => apiFetch<{ sincronizados: number; conStock: number; sinStock: number }>('/admin/stock/sync', { method: 'POST' }),
  },
  caja: {
    turnoActual: () => apiFetch<TurnoCaja | null>('/cash/shift/current'),
    abrirTurno: (montoApertura: number) =>
      apiFetch<TurnoCaja>('/cash/shift/open', { method: 'POST', body: JSON.stringify({ montoApertura }) }),
    cerrarTurno: (montoCierreReal: number) =>
      apiFetch<TurnoCaja>('/cash/shift/close', { method: 'POST', body: JSON.stringify({ montoCierreReal }) }),
    visitasParaCobrar: () => apiFetch<VisitaResumen[]>('/cash/visits-to-collect'),
    detalleVisita: (visitaId: string) => apiFetch<DetalleVisitaCaja>(`/cash/visits/${visitaId}`),
    registrarPago: (visitaId: string, pagos: Array<{ metodoPago: string; monto: number }>) =>
      apiFetch(`/cash/visits/${visitaId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ pagos }),
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
  mesaNumero: number;
  fechaApertura: string;
  total: string;
  pedidos: number;
}

export interface DetalleVisitaCaja {
  visitaId: string;
  mesaNumero: number;
  fechaApertura: string;
  resumen: Array<{ nombre: string; cantidad: number; precioUnitario: string }>;
  total: string;
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
