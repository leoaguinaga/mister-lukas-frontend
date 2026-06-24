import { EstadoPedido } from '@/lib/types';

const CONFIG: Record<EstadoPedido, { label: string; className: string }> = {
  pendiente:      { label: 'Pendiente',     className: 'bg-muted text-muted-foreground' },
  en_preparacion: { label: 'En cocina',     className: 'bg-blue-100 text-blue-700' },
  listo:          { label: '¡Listo!',       className: 'bg-[#fdf3d8] text-[var(--dorado)] font-bold animate-pulse' },
  entregado:      { label: 'Entregado',     className: 'bg-[#e8f0d8] text-[var(--salvia)]' },
  cancelado:      { label: 'Cancelado',     className: 'bg-destructive/10 text-destructive' },
};

export function EstadoBadge({ estado }: { estado: EstadoPedido }) {
  const { label, className } = CONFIG[estado];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
