'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { PlatoCarta } from '@/lib/types';
import { Button } from '@/components/ui/button';

const CATEGORIA_LABEL: Record<string, string> = {
  fraccionable: 'Pollo a la brasa',
  reventa:      'Bebidas',
  multi_insumo: 'Extras / Platos de fondo',
};
const CATEGORIAS = ['fraccionable', 'reventa', 'multi_insumo'];

export default function AdminCatalogoPage() {
  const [platos, setPlatos]     = useState<PlatoCarta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: '', precio: '', categoriaInventario: 'multi_insumo' });
  const [guardando, setGuardando] = useState(false);

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
    const id = setInterval(fetchPlatos, 20000);
    return () => clearInterval(id);
  }, [fetchPlatos]);

  async function handleToggleDisponible(plato: PlatoCarta) {
    setToggling(plato.id + '_disp');
    try {
      await api.menu.toggleDisponible(plato.id, !plato.disponible);
      setPlatos((prev) => prev.map((p) => p.id === plato.id ? { ...p, disponible: !p.disponible } : p));
      toast.success(!plato.disponible ? `"${plato.nombre}" disponible` : `"${plato.nombre}" sin stock`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setToggling(null); }
  }

  async function handleToggleActivo(plato: PlatoCarta) {
    setToggling(plato.id + '_activo');
    const nuevoActivo = !plato.activo;
    try {
      await api.admin.toggleActivoPlato(plato.id, nuevoActivo);
      setPlatos((prev) => prev.map((p) => p.id === plato.id ? { ...p, activo: nuevoActivo } : p));
      toast.success(nuevoActivo ? `"${plato.nombre}" activado en carta` : `"${plato.nombre}" retirado de carta`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setToggling(null); }
  }

  async function handleCrearPlato() {
    if (!form.nombre || !form.precio) { toast.error('Completa nombre y precio'); return; }
    const precio = parseFloat(form.precio);
    if (isNaN(precio) || precio <= 0) { toast.error('Precio inválido'); return; }
    setGuardando(true);
    try {
      await api.admin.crearPlato({ ...form, precio: precio.toFixed(2) });
      toast.success(`"${form.nombre}" agregado a la carta`);
      setForm({ nombre: '', precio: '', categoriaInventario: 'multi_insumo' });
      fetchPlatos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setGuardando(false); }
  }

  const sinStock  = platos.filter((p) => p.activo && !p.disponible).length;

  if (cargando) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando carta…</div>;

  return (
    <div className="p-5 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold text-[var(--carbon)]">Carta</h2>
        {sinStock > 0 && <span className="text-xs font-medium text-[var(--terracota)]">{sinStock} sin stock</span>}
      </div>

      {CATEGORIAS.map((cat) => {
        const items = platos.filter((p) => p.categoriaInventario === cat);
        if (!items.length) return null;
        return (
          <section key={cat}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              {CATEGORIA_LABEL[cat]}
            </h3>
            <div className="rounded-2xl border border-border bg-white overflow-hidden divide-y divide-border">
              {items.map((plato) => (
                <div key={plato.id} className={['flex items-center gap-3 px-4 py-3', !plato.activo ? 'opacity-50' : ''].join(' ')}>
                  <div className="flex-1 min-w-0">
                    <p className={['font-medium truncate', !plato.disponible ? 'text-muted-foreground line-through' : 'text-[var(--carbon)]'].join(' ')}>
                      {plato.nombre}
                    </p>
                    <p className="text-sm text-muted-foreground">S/{plato.precio}</p>
                  </div>
                  {/* Toggle disponible (día a día) */}
                  <button
                    onClick={() => handleToggleDisponible(plato)}
                    disabled={toggling === plato.id + '_disp' || !plato.activo}
                    className={[
                      'shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-40',
                      plato.disponible
                        ? 'bg-[var(--salvia)]/15 text-[var(--salvia)] hover:bg-[var(--salvia)]/25'
                        : 'bg-[var(--terracota)]/15 text-[var(--terracota)] hover:bg-[var(--terracota)]/25',
                    ].join(' ')}
                  >
                    {toggling === plato.id + '_disp' ? '…' : plato.disponible ? 'Hay' : 'No hay'}
                  </button>
                  {/* Toggle activo (permanente) */}
                  <button
                    onClick={() => handleToggleActivo(plato)}
                    disabled={toggling === plato.id + '_activo'}
                    title={plato.activo ? 'Retirar de carta' : 'Volver a carta'}
                    className="shrink-0 text-xs text-muted-foreground hover:text-[var(--carbon)] px-2 py-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-40"
                  >
                    {toggling === plato.id + '_activo' ? '…' : plato.activo ? 'En carta' : 'Retirado'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Agregar nuevo plato */}
      <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
        <p className="text-sm font-semibold text-[var(--carbon)]">Nuevo plato</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-muted-foreground">Nombre</label>
            <input
              type="text" placeholder="Ej: Caldo de pollo"
              value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Precio (S/)</label>
            <input
              type="number" min="0" step="0.50" placeholder="0.00"
              value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Categoría</label>
            <select
              value={form.categoriaInventario}
              onChange={(e) => setForm({ ...form, categoriaInventario: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-white"
            >
              <option value="multi_insumo">Extras / Platos de fondo</option>
              <option value="fraccionable">Pollo a la brasa</option>
              <option value="reventa">Bebidas</option>
            </select>
          </div>
        </div>
        <Button
          className="w-full bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold"
          onClick={handleCrearPlato} disabled={guardando || !form.nombre || !form.precio}
        >
          {guardando ? 'Agregando…' : 'Agregar a la carta'}
        </Button>
      </div>
    </div>
  );
}
