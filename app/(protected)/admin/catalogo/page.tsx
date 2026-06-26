'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { PlatoCarta, TipoPlato } from '@/lib/types';
import { Button } from '@/components/ui/button';

const TIPO_LABEL: Record<TipoPlato, string> = {
  entradas:             'Entradas',
  platos_a_la_carta:    'Platos a la carta',
  parrillas:            'Parrillas',
  parrillas_familiares: 'Parrillas Familiares',
  pastas:               'Pastas',
  guarniciones:         'Guarniciones',
};
const TIPOS_ORDEN: TipoPlato[] = ['entradas', 'platos_a_la_carta', 'parrillas', 'parrillas_familiares', 'pastas', 'guarniciones'];
const SECCIONES = [
  { key: 'fraccionable', label: 'Pollo a la brasa' },
  { key: 'reventa',      label: 'Bebidas' },
];

type FormState = { nombre: string; precio: string; categoriaInventario: string; tipoPlato: TipoPlato };

const FORM_VACIO: FormState = { nombre: '', precio: '', categoriaInventario: 'multi_insumo', tipoPlato: 'platos_a_la_carta' };

function EditModal({ plato, onClose, onSaved }: { plato: PlatoCarta; onClose: () => void; onSaved: (p: PlatoCarta) => void }) {
  const [form, setForm] = useState<FormState>({
    nombre:              plato.nombre,
    precio:              plato.precio,
    categoriaInventario: plato.categoriaInventario,
    tipoPlato:           plato.tipoPlato ?? 'platos_a_la_carta',
  });
  const [guardando, setGuardando] = useState(false);

  async function handleGuardar() {
    if (!form.nombre || !form.precio) { toast.error('Completa nombre y precio'); return; }
    const precio = parseFloat(form.precio);
    if (isNaN(precio) || precio <= 0) { toast.error('Precio inválido'); return; }
    setGuardando(true);
    try {
      await api.admin.editarPlato(plato.id, {
        nombre:              form.nombre,
        precio:              precio.toFixed(2),
        categoriaInventario: form.categoriaInventario,
        tipoPlato:           form.categoriaInventario === 'multi_insumo' ? form.tipoPlato : null,
      });
      onSaved({ ...plato, nombre: form.nombre, precio: precio.toFixed(2), categoriaInventario: form.categoriaInventario as PlatoCarta['categoriaInventario'], tipoPlato: form.categoriaInventario === 'multi_insumo' ? form.tipoPlato : null });
      toast.success(`"${form.nombre}" actualizado`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[var(--carbon)]">Editar plato</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-[var(--carbon)] text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Precio (S/)</label>
            <input
              type="number" min="0" step="0.50"
              value={form.precio}
              onChange={(e) => setForm({ ...form, precio: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Tipo</label>
            <select
              value={form.categoriaInventario}
              onChange={(e) => setForm({ ...form, categoriaInventario: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-white"
            >
              <option value="multi_insumo">Plato (carta)</option>
              <option value="fraccionable">Pollo a la brasa</option>
              <option value="reventa">Bebida</option>
            </select>
          </div>
          {form.categoriaInventario === 'multi_insumo' && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Categoría</label>
              <select
                value={form.tipoPlato}
                onChange={(e) => setForm({ ...form, tipoPlato: e.target.value as TipoPlato })}
                className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-white"
              >
                {TIPOS_ORDEN.map((t) => (
                  <option key={t} value={t}>{TIPO_LABEL[t]}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
          <Button
            className="flex-1 h-10 bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold"
            onClick={handleGuardar}
            disabled={guardando}
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCatalogoPage() {
  const [platos, setPlatos]     = useState<PlatoCarta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [editando, setEditando] = useState<PlatoCarta | null>(null);
  const [form, setForm]         = useState<FormState>(FORM_VACIO);
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
      const body: Record<string, string> = { nombre: form.nombre, precio: precio.toFixed(2), categoriaInventario: form.categoriaInventario };
      if (form.categoriaInventario === 'multi_insumo') body.tipoPlato = form.tipoPlato;
      await api.admin.crearPlato(body as Parameters<typeof api.admin.crearPlato>[0]);
      toast.success(`"${form.nombre}" agregado a la carta`);
      setForm(FORM_VACIO);
      fetchPlatos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setGuardando(false); }
  }

  const PlatoRow = ({ plato }: { plato: PlatoCarta }) => (
    <div className={['flex items-center gap-2 px-4 py-3', !plato.activo ? 'opacity-50' : ''].join(' ')}>
      <div className="flex-1 min-w-0">
        <p className={['font-medium truncate', !plato.disponible ? 'text-muted-foreground line-through' : 'text-[var(--carbon)]'].join(' ')}>
          {plato.nombre}
        </p>
        <p className="text-sm text-muted-foreground">S/{plato.precio}</p>
      </div>

      {/* Editar */}
      <button
        onClick={() => setEditando(plato)}
        title="Editar"
        className="shrink-0 text-muted-foreground hover:text-[var(--carbon)] px-2 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm"
      >
        ✎
      </button>

      {/* Disponible */}
      <button
        onClick={() => handleToggleDisponible(plato)}
        disabled={toggling === plato.id + '_disp' || !plato.activo}
        className={['shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-40',
          plato.disponible ? 'bg-[var(--salvia)]/15 text-[var(--salvia)] hover:bg-[var(--salvia)]/25'
                           : 'bg-[var(--terracota)]/15 text-[var(--terracota)] hover:bg-[var(--terracota)]/25',
        ].join(' ')}
      >
        {toggling === plato.id + '_disp' ? '…' : plato.disponible ? 'Hay' : 'No hay'}
      </button>

      {/* Activo */}
      <button
        onClick={() => handleToggleActivo(plato)}
        disabled={toggling === plato.id + '_activo'}
        title={plato.activo ? 'Retirar de carta' : 'Volver a carta'}
        className="shrink-0 text-xs text-muted-foreground hover:text-[var(--carbon)] px-2 py-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-40"
      >
        {toggling === plato.id + '_activo' ? '…' : plato.activo ? 'En carta' : 'Retirado'}
      </button>
    </div>
  );

  const sinStock = platos.filter((p) => p.activo && !p.disponible).length;

  if (cargando) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando carta…</div>;

  return (
    <>
      {editando && (
        <EditModal
          plato={editando}
          onClose={() => setEditando(null)}
          onSaved={(updated) => {
            setPlatos((prev) => prev.map((p) => p.id === updated.id ? { ...p, ...updated } : p));
            setEditando(null);
          }}
        />
      )}

      <div className="p-5 space-y-6 max-w-2xl mx-auto">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-[var(--carbon)]">Carta</h2>
          {sinStock > 0 && <span className="text-xs font-medium text-[var(--terracota)]">{sinStock} sin stock</span>}
        </div>

        {TIPOS_ORDEN.map((tipo) => {
          const items = platos.filter((p) => p.categoriaInventario === 'multi_insumo' && p.tipoPlato === tipo);
          if (!items.length) return null;
          return (
            <section key={tipo}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{TIPO_LABEL[tipo]}</h3>
              <div className="rounded-2xl border border-border bg-white overflow-hidden divide-y divide-border">
                {items.map((p) => <PlatoRow key={p.id} plato={p} />)}
              </div>
            </section>
          );
        })}

        {(() => {
          const items = platos.filter((p) => p.categoriaInventario === 'multi_insumo' && !p.tipoPlato);
          if (!items.length) return null;
          return (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Sin categoría</h3>
              <div className="rounded-2xl border border-border bg-white overflow-hidden divide-y divide-border">
                {items.map((p) => <PlatoRow key={p.id} plato={p} />)}
              </div>
            </section>
          );
        })()}

        {SECCIONES.map(({ key, label }) => {
          const items = platos.filter((p) => p.categoriaInventario === key);
          if (!items.length) return null;
          return (
            <section key={key}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{label}</h3>
              <div className="rounded-2xl border border-border bg-white overflow-hidden divide-y divide-border">
                {items.map((p) => <PlatoRow key={p.id} plato={p} />)}
              </div>
            </section>
          );
        })}

        {/* Nuevo plato */}
        <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
          <p className="text-sm font-semibold text-[var(--carbon)]">Nuevo plato</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-muted-foreground">Nombre</label>
              <input
                type="text" placeholder="Ej: Lomo saltado"
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
              <label className="text-xs text-muted-foreground">Tipo</label>
              <select
                value={form.categoriaInventario}
                onChange={(e) => setForm({ ...form, categoriaInventario: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-white"
              >
                <option value="multi_insumo">Plato (carta)</option>
                <option value="fraccionable">Pollo a la brasa</option>
                <option value="reventa">Bebida</option>
              </select>
            </div>
            {form.categoriaInventario === 'multi_insumo' && (
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-muted-foreground">Categoría</label>
                <select
                  value={form.tipoPlato}
                  onChange={(e) => setForm({ ...form, tipoPlato: e.target.value as TipoPlato })}
                  className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-white"
                >
                  {TIPOS_ORDEN.map((t) => (
                    <option key={t} value={t}>{TIPO_LABEL[t]}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <Button
            className="w-full bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold"
            onClick={handleCrearPlato} disabled={guardando || !form.nombre || !form.precio}
          >
            {guardando ? 'Agregando…' : 'Agregar a la carta'}
          </Button>
        </div>
      </div>
    </>
  );
}
