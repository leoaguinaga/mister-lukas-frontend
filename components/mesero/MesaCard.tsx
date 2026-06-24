'use client';

import { Mesa } from '@/lib/types';

interface Props {
  mesa: Mesa;
  onClick: () => void;
}

export function MesaCard({ mesa, onClick }: Props) {
  const libre = mesa.estado === 'libre';

  return (
    <button
      onClick={onClick}
      className={[
        'relative flex flex-col items-center justify-center rounded-2xl border-2 p-6 transition-all active:scale-95 select-none',
        'min-h-[140px] w-full cursor-pointer',
        libre
          ? 'bg-white border-[var(--salvia)] hover:bg-[#f5f9ee]'
          : 'bg-[#fdf0ed] border-[var(--terracota)] hover:bg-[#fae5e1]',
      ].join(' ')}
    >
      <span
        className={[
          'text-5xl font-bold leading-none',
          libre ? 'text-[var(--carbon)]' : 'text-[var(--terracota)]',
        ].join(' ')}
      >
        {mesa.numero}
      </span>

      <span
        className={[
          'mt-3 rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide',
          libre
            ? 'bg-[#e8f0d8] text-[var(--salvia)]'
            : 'bg-[var(--terracota)] text-white',
        ].join(' ')}
      >
        {libre ? 'Libre' : 'Ocupada'}
      </span>

      {mesa.capacidad && (
        <span className="absolute top-2 right-3 text-xs text-muted-foreground">
          {mesa.capacidad} pers.
        </span>
      )}
    </button>
  );
}
