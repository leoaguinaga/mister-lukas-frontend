'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { PlatoCarta } from '@/lib/types';

const CATEGORIA_LABEL: Record<string, string> = {
  fraccionable: 'Pollo a la brasa',
  reventa:      'Bebidas',
  multi_insumo: 'Extras',
};

export default function CartaPage() {
  const [platos, setPlatos] = useState<PlatoCarta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchPlatos = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/platos`,
        { credentials: 'include' },
      );
      const data = await res.json();
      if (Array.isArray(data)) setPlatos(data);
    } catch {
      // silencioso
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatos();
    const id = setInterval(fetchPlatos, 10000);
    return () => clearInterval(id);
  }, [fetchPlatos]);

  async function handleToggle(plato: PlatoCarta) {
    setToggling(plato.id);
    try {
      await api.menu.toggleDisponible(plato.id, !plato.disponible);
      setPlatos((prev) =>
        prev.map((p) => (p.id === plato.id ? { ...p, disponible: !p.disponible } : p)),
      );
      toast.success(!plato.disponible ? `"${plato.nombre}" disponible` : `"${plato.nombre}" sin stock`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setToggling(null);
    }
  }

  if (cargando) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando carta…</div>;
  }

  const categorias = ['fraccionable', 'reventa', 'multi_insumo'];

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold text-[var(--carbon)]">Carta</h2>
        <span className="text-xs text-muted-foreground">
          {platos.filter((p) => !p.disponible).length} sin stock
        </span>
      </div>

      {categorias.map((cat) => {
        const items = platos.filter((p) => p.categoriaInventario === cat);
        if (!items.length) return null;
        return (
          <section key={cat}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              {CATEGORIA_LABEL[cat]}
            </h3>
            <div className="space-y-2">
              {items.map((plato) => (
                <div
                  key={plato.id}
                  className={[
                    'flex items-center justify-between rounded-xl border bg-white px-4 py-3 transition-opacity',
                    !plato.disponible ? 'opacity-50' : '',
                  ].join(' ')}
                >
                  <div>
                    <p className={['font-medium text-sm', !plato.disponible ? 'line-through text-muted-foreground' : ''].join(' ')}>
                      {plato.nombre}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">S/{plato.precio}</span>
                      {cat !== 'multi_insumo' && plato.stockActual !== null && (
                        <span className={[
                          'text-xs font-medium',
                          plato.stockActual <= 0 ? 'text-[var(--terracota)]' : 'text-[var(--salvia)]',
                        ].join(' ')}>
                          {plato.stockActual <= 0 ? 'Agotado' : `${plato.stockActual} ${plato.nombreUnidadMinima ?? ''}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggle(plato)}
                    disabled={toggling === plato.id}
                    className={[
                      'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50',
                      plato.disponible
                        ? 'bg-[#fde8e4] text-[var(--terracota)] hover:bg-[#f9d0c9]'
                        : 'bg-[#e8f0d8] text-[var(--salvia)] hover:bg-[#d8e4c4]',
                    ].join(' ')}
                  >
                    {plato.disponible ? 'No hay' : 'Hay'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
