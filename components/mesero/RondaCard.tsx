'use client';

import { Pedido, PlatoCarta } from '@/lib/types';
import { EstadoBadge } from './EstadoBadge';
import { Button } from '@/components/ui/button';

interface Props {
  pedido: Pedido;
  platoMap: Map<string, PlatoCarta>;
  onMarcarEntregado: (pedidoId: string) => void;
  onCancelar: (pedidoId: string) => void;
  cargando?: boolean;
}

const ESTADOS_ACTIVOS = ['pendiente', 'en_preparacion', 'listo'];

export function RondaCard({ pedido, platoMap, onMarcarEntregado, onCancelar, cargando }: Props) {
  const hora = new Date(pedido.fechaCreacion).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const subtotal = pedido.items.reduce(
    (s, i) => s + parseFloat(i.precioUnitarioCongelado) * i.cantidad,
    0,
  );

  const activo = ESTADOS_ACTIVOS.includes(pedido.estado);

  return (
    <div className={[
      'rounded-xl border bg-white p-4 space-y-3 transition-opacity',
      !activo ? 'opacity-60' : '',
    ].join(' ')}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Ronda · {hora}</span>
        <EstadoBadge estado={pedido.estado} />
      </div>

      <ul className="space-y-1.5">
        {pedido.items.map((item) => {
          const plato = platoMap.get(item.platoCartaId);
          const tachado = pedido.estado === 'entregado' || pedido.estado === 'cancelado';
          return (
            <li key={item.id} className={tachado ? 'opacity-50 line-through' : ''}>
              <span className="font-medium">{item.cantidad}×</span>{' '}
              <span>{plato?.nombre ?? item.platoCartaId}</span>
              {item.notas && (
                <span className="ml-2 text-xs text-muted-foreground italic">→ {item.notas}</span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <span className="text-sm text-muted-foreground">S/{subtotal.toFixed(2)}</span>

        {activo && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCancelar(pedido.id)}
              disabled={cargando}
              className="text-xs text-muted-foreground hover:text-[var(--terracota)] underline transition-colors disabled:opacity-40"
            >
              Cancelar
            </button>
            <Button
              size="sm"
              onClick={() => onMarcarEntregado(pedido.id)}
              disabled={cargando}
              className="bg-[var(--salvia)] hover:bg-[#7a8a4e] text-white"
            >
              {cargando ? '…' : 'Entregar'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
