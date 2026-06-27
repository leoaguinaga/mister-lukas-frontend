export type EstadoMesa = 'libre' | 'ocupada';
export type EstadoPedido = 'pendiente' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado';
export type CategoriaInventario = 'fraccionable' | 'reventa' | 'multi_insumo';
export type TipoPlato =
  | 'entradas' | 'platos_a_la_carta' | 'parrillas' | 'parrillas_familiares' | 'pastas' | 'guarniciones'
  | 'refresco' | 'bebida' | 'coctel';

export interface Mesa {
  id: string;
  numero: number;
  estado: EstadoMesa;
  capacidad: number | null;
}

export interface PlatoCarta {
  id: string;
  nombre: string;
  precio: string;
  categoriaInventario: CategoriaInventario;
  tipoPlato: TipoPlato | null;
  disponible: boolean;
  activo: boolean;
  descripcion: string | null;
  stockActual: number | null;
  nombreUnidadMinima: string | null;
}

export interface ItemPedido {
  id: string;
  pedidoId: string;
  platoCartaId: string;
  cantidad: number;
  precioUnitarioCongelado: string;
  notas: string | null;
  estado: EstadoPedido;
}

export interface Pedido {
  id: string;
  visitaMesaId: string;
  estado: EstadoPedido;
  fechaCreacion: string;
  fechaListo: string | null;
  fechaEntregado: string | null;
  items: ItemPedido[];
}

export interface Visita {
  id: string;
  mesaId: string;
  estado: 'abierta' | 'cerrada';
  paraLlevar: boolean;
  fechaApertura: string;
  fechaCierre: string | null;
  pedidos: Pedido[];
  total: string;
}
