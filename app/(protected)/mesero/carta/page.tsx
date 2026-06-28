'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { PlatoCarta, CategoriaProducto } from '@/lib/types';
import { Search } from 'lucide-react';

const CATEGORIA_LABEL: Record<CategoriaProducto, string> = {
  pollo_a_la_brasa:     'Pollo a la brasa',
  entradas:             'Entradas',
  platos_a_la_carta:    'Platos a la carta',
  parrillas:            'Parrillas',
  parrillas_familiares: 'Parrillas Familiares',
  pastas:               'Pastas',
  guarniciones:         'Guarniciones',
  refrescos_jugos:      'Refrescos o Jugos',
  bebidas:              'Bebidas',
  cocteles:             'Cócteles',
  extras:               'Extras',
};

const CATEGORIAS_ORDEN: CategoriaProducto[] = [
  'pollo_a_la_brasa',
  'entradas',
  'platos_a_la_carta',
  'parrillas',
  'parrillas_familiares',
  'pastas',
  'guarniciones',
  'refrescos_jugos',
  'bebidas',
  'cocteles',
  'extras',
];

export default function CartaPage() {
  const [platos, setPlatos] = useState<PlatoCarta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCat, setFiltroCat] = useState<'todas' | CategoriaProducto>('todas');

  const fetchPlatos = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/platos`, { credentials: 'include' });
      const data = await res.json();
      if (Array.isArray(data)) setPlatos(data);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
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
      setPlatos((prev) => prev.map((p) => (p.id === plato.id ? { ...p, disponible: !p.disponible } : p)));
      toast.success(!plato.disponible ? `"${plato.nombre}" disponible` : `"${plato.nombre}" sin stock`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setToggling(null); }
  }

  if (cargando) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando carta…</div>;

  const PlatoCard = ({ plato }: { plato: PlatoCarta }) => (
    <div className={['flex items-center justify-between rounded-xl border bg-white px-4 py-3 transition-opacity', !plato.disponible ? 'opacity-50' : ''].join(' ')}>
      <div>
        <p className={['font-medium text-sm', !plato.disponible ? 'line-through text-muted-foreground' : ''].join(' ')}>
          {plato.nombre}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-muted-foreground">S/{plato.precio}</span>
          {plato.categoria === 'bebidas' && plato.stockActual !== null && (
            <span className={['text-xs font-medium', plato.stockActual <= 0 ? 'text-[var(--terracota)]' : 'text-[var(--salvia)]'].join(' ')}>
              {plato.stockActual <= 0 ? 'Agotado' : `${plato.stockActual} ${plato.nombreUnidadMinima ?? ''}`}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => handleToggle(plato)}
        disabled={toggling === plato.id}
        className={['rounded-full px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50',
          plato.disponible ? 'bg-[#fde8e4] text-[var(--terracota)] hover:bg-[#f9d0c9]'
                           : 'bg-[#e8f0d8] text-[var(--salvia)] hover:bg-[#d8e4c4]',
        ].join(' ')}
      >
        {plato.disponible ? 'No hay' : 'Hay'}
      </button>
    </div>
  );

  const Section = ({ label, items }: { label: string; items: PlatoCarta[] }) => {
    if (!items.length) return null;
    return (
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{label}</h3>
        <div className="space-y-2">
          {items.map((p) => <PlatoCard key={p.id} plato={p} />)}
        </div>
      </section>
    );
  };

  const q = busqueda.trim().toLowerCase();
  const platosFiltrados = platos.filter((p) => {
    if (filtroCat !== 'todas' && p.categoria !== filtroCat) return false;
    if (q && !p.nombre.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold text-[var(--carbon)]">Carta</h2>
        <span className="text-xs text-muted-foreground">{platos.filter((p) => !p.disponible).length} sin stock</span>
      </div>

      <div className="flex items-center gap-2 sticky top-0 z-10 bg-[var(--crema)] py-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar plato…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
          />
        </div>
        <select
          value={filtroCat}
          onChange={(e) => setFiltroCat(e.target.value as typeof filtroCat)}
          className="h-10 px-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
        >
          <option value="todas">Todas</option>
          {CATEGORIAS_ORDEN.map((cat) => (
            <option key={cat} value={cat}>{CATEGORIA_LABEL[cat]}</option>
          ))}
        </select>
      </div>

      {platosFiltrados.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Ningún plato coincide con la búsqueda.</p>
      ) : (
        <div className="space-y-6">
          {CATEGORIAS_ORDEN.map((cat) => (
            <Section
              key={cat}
              label={CATEGORIA_LABEL[cat]}
              items={platosFiltrados.filter((p) => p.categoria === cat)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
